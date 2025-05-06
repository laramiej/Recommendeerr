import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import PlexAPI from '@server/api/plexapi';
import { getSettings, OpenAISettings } from '@server/lib/settings';
import { MediaStatus, MediaType } from '@server/constants/media';
import TheMovieDb from '@server/api/themoviedb';
import logger from '@server/logger';
import axios from 'axios';
import { randomInt } from 'crypto';
import { shuffle } from 'lodash';

const pickerRoutes = Router();

interface RandomMovieQueryParams {
  count?: string;
}

interface AiRecommendBody {
  prompt: string;
  count?: number;
}

// Get random movies from Plex library
pickerRoutes.get('/random', async (req: Request<unknown, unknown, unknown, RandomMovieQueryParams>, res: Response, next: NextFunction) => {
  const count = Number(req.query.count) || 5;
  const mediaRepository = getRepository(Media);

  try {
    // Find available movies in Plex
    const availableMedia = await mediaRepository.find({
      where: {
        mediaType: MediaType.MOVIE,
        status: MediaStatus.AVAILABLE,
      },
    });

    // Get random sample
    const randomMovies = shuffle(availableMedia).slice(0, count);

    // Fetch full details for each movie
    const tmdb = new TheMovieDb();
    const detailedMovies = await Promise.all(
      randomMovies.map(async (media: Media) => {
        try {
          const details = await tmdb.getMovie({ movieId: media.tmdbId });
          return { ...media, details };
        } catch (error) {
          logger.error('Error fetching movie details', {
            label: 'API',
            movieId: media.tmdbId,
            errorMessage: error.message
          });
          return null;
        }
      })
    );

    return res.status(200).json(detailedMovies.filter(Boolean));
  } catch (error) {
    logger.error('Error fetching random movies', {
      label: 'API',
      errorMessage: error.message
    });
    return next({
      status: 500,
      message: 'Unable to fetch random movies.',
    });
  }
});

// Get similar movies based on a given movie ID
pickerRoutes.get('/similar/:tmdbId', async (req: Request<{ tmdbId: string }>, res: Response, next: NextFunction) => {
  const tmdbId = Number(req.params.tmdbId);
  const tmdb = new TheMovieDb();
  const mediaRepository = getRepository(Media);

  try {
    const similarMovies = await tmdb.getMovieSimilar({ movieId: tmdbId });

    // Find available movies in the user's library
    const availableMedia = await mediaRepository.find({
      where: {
        mediaType: MediaType.MOVIE,
        status: MediaStatus.AVAILABLE,
      },
    });

    // Create a map of available TMDb IDs for faster lookup
    const availableTmdbIds = new Set(availableMedia.map((media: Media) => media.tmdbId));

    // Filter results to only include available movies
    const filteredResults = similarMovies.results.filter(movie =>
      availableTmdbIds.has(movie.id)
    );

    return res.status(200).json({
      results: filteredResults,
      totalResults: filteredResults.length,
    });
  } catch (error) {
    logger.error('Error fetching similar movies', {
      label: 'API',
      tmdbId,
      errorMessage: error.message
    });
    return next({
      status: 500,
      message: 'Unable to fetch similar movies.',
    });
  }
});

// Get movie recommendations based on mood
pickerRoutes.get('/mood/:mood', async (req: Request<{ mood: string }>, res: Response, next: NextFunction) => {
  const { mood } = req.params;
  const tmdb = new TheMovieDb();
  const mediaRepository = getRepository(Media);

  // Map moods to genres or keywords
  const moodMap: Record<string, { genres: number[], keywords: string }> = {
    happy: { genres: [35, 10751], keywords: 'happy,uplifting,comedy' },
    sad: { genres: [18], keywords: 'sad,emotional,drama' },
    excited: { genres: [28, 12], keywords: 'action,adventure,thriller' },
    relaxed: { genres: [36, 99], keywords: 'gentle,calm,relaxing' },
    scared: { genres: [27, 53], keywords: 'horror,scary,suspense' },
  };

  try {
    const moodParams = moodMap[mood] || moodMap.happy;
    const genre = moodParams.genres.join(',');

    const discoverResults = await tmdb.getDiscoverMovies({
      genre,
      keywords: moodParams.keywords,
    });

    // Find available movies in the user's library
    const availableMedia = await mediaRepository.find({
      where: {
        mediaType: MediaType.MOVIE,
        status: MediaStatus.AVAILABLE,
      },
    });

    // Create a map of available TMDb IDs for faster lookup
    const availableTmdbIds = new Set(availableMedia.map((media: Media) => media.tmdbId));

    // Filter results to only include available movies
    const filteredResults = discoverResults.results.filter(movie =>
      availableTmdbIds.has(movie.id)
    );

    return res.status(200).json({
      results: filteredResults,
      totalResults: filteredResults.length,
    });
  } catch (error) {
    logger.error('Error fetching mood-based movies', {
      label: 'API',
      mood,
      errorMessage: error.message
    });
    return next({
      status: 500,
      message: 'Unable to fetch mood-based movies.',
    });
  }
});

// LLM-based recommendations
pickerRoutes.post('/ai-recommend', async (req: Request<unknown, unknown, AiRecommendBody>, res: Response, next: NextFunction) => {
  const { prompt, count = 5 } = req.body;
  const settings = getSettings();
  const llmApiKey = settings.openai?.apiKey;

  if (!prompt) {
    return next({
      status: 400,
      message: 'A prompt is required for AI recommendations.',
    });
  }

  if (!llmApiKey) {
    return next({
      status: 400,
      message: 'OpenAI API key not configured in settings.',
    });
  }

  try {
    // Call OpenAI API
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a movie recommendation expert. Provide movie recommendations based on the user criteria. Return only a JSON array with movie titles and years, like [{"title": "The Godfather", "year": 1972}].'
          },
          { role: 'user', content: `Recommend ${count} movies based on: ${prompt}` }
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        }
      }
    );

    let recommendedMovies;
    try {
      recommendedMovies = JSON.parse(openaiResponse.data.choices[0].message.content);
    } catch (parseError) {
      logger.error('Error parsing AI recommendation response', {
        label: 'API',
        response: openaiResponse.data.choices[0].message.content,
        errorMessage: parseError.message
      });

      return next({
        status: 500,
        message: 'Error parsing AI recommendations.',
      });
    }

    // Search for these movies in TMDB
    const tmdb = new TheMovieDb();
    const mediaRepository = getRepository(Media);

    // Find available movies in user's library for later filtering
    const availableMedia = await mediaRepository.find({
      where: {
        mediaType: MediaType.MOVIE,
        status: MediaStatus.AVAILABLE,
      },
    });

    const availableTmdbIds = new Set(availableMedia.map((media: Media) => media.tmdbId));

    // Get details for recommended movies
    const detailedMovies = await Promise.all(
      recommendedMovies.map(async (movie: { title: string; year: number }) => {
        try {
          const searchResults = await tmdb.searchMovies({
            query: movie.title,
            year: movie.year,
          });

          if (searchResults.results.length > 0) {
            // Get the first match that's available in the user's library
            const availableMatch = searchResults.results.find(result =>
              availableTmdbIds.has(result.id)
            );

            // Or just return the first match if none are available
            return availableMatch || searchResults.results[0];
          }
          return null;
        } catch (error) {
          logger.error('Error searching for recommended movie', {
            label: 'API',
            movie: movie.title,
            errorMessage: error.message
          });
          return null;
        }
      })
    );

    return res.status(200).json({
      results: detailedMovies.filter(Boolean),
      totalResults: detailedMovies.filter(Boolean).length,
      isAvailable: detailedMovies.map(movie => movie ? availableTmdbIds.has(movie.id) : false)
    });
  } catch (error) {
    logger.error('Error getting AI recommendations', {
      label: 'API',
      errorMessage: error.message
    });
    return next({
      status: 500,
      message: 'Unable to fetch AI recommendations.',
    });
  }
});

export default pickerRoutes;
