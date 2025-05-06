import React, { useState } from 'react';
import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import TitleCard from '@app/components/TitleCard';
import SearchInput from '@app/components/Common/SearchInput';
import axios from 'axios';
import { defineMessages, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR from 'swr';

const messages = defineMessages({
  searchmovie: 'Search for a movie',
  noresults: 'No results found',
  nomoviesfound: 'No similar movies found',
  similar: 'Similar to {title}',
  error: 'Error loading similar movies',
  searcherror: 'Error searching for movies',
  selectfirst: 'First, select a movie to find similar titles',
});

interface SearchResult {
  id: number;
  mediaType: string;
  mediaInfo: {
    title: string;
    releaseDate: string;
    posterPath: string;
  };
}

const SimilarPicker = () => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const [searchValue, setSearchValue] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<SearchResult | null>(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  const { data: searchResults, error: searchError, isValidating: isSearching } = useSWR(
    searchValue ? `/api/v1/search?query=${searchValue}&page=1&includeAdult=false` : null,
    {
      revalidateOnFocus: false,
    }
  );

  const getSimilarMovies = async (movieId: number) => {
    setIsLoadingSimilar(true);
    try {
      const response = await axios.get(`/api/v1/picker/similar/${movieId}`);
      setSimilarMovies(response.data.results);
    } catch (error) {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const handleMovieSelect = (movie: SearchResult) => {
    setSelectedMovie(movie);
    if (movie.id) {
      getSimilarMovies(movie.id);
    }
  };

  if (searchError) {
    addToast(intl.formatMessage(messages.searcherror), {
      appearance: 'error',
      autoDismiss: true,
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {selectedMovie
            ? intl.formatMessage(messages.similar, { title: selectedMovie.mediaInfo.title })
            : intl.formatMessage(messages.selectfirst)}
        </h2>
        <SearchInput
          value={searchValue}
          onChange={setSearchValue}
          placeholder={intl.formatMessage(messages.searchmovie)}
        />
        {searchValue && (
          <div className="mt-4 border border-gray-800 rounded-lg shadow-md overflow-hidden">
            {isSearching ? (
              <div className="p-4 text-center">
                <LoadingSpinner />
              </div>
            ) : searchResults?.results?.length > 0 ? (
              <div className="max-h-56 overflow-y-auto">
                {searchResults.results
                  .filter((result: SearchResult) => result.mediaType === 'movie')
                  .map((movie: SearchResult) => (
                    <div
                      key={movie.id}
                      className={`flex items-center p-2 hover:bg-gray-800 cursor-pointer ${
                        selectedMovie?.id === movie.id ? 'bg-gray-700' : ''
                      }`}
                      onClick={() => handleMovieSelect(movie)}
                    >
                      {movie.mediaInfo.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.mediaInfo.posterPath}`}
                          alt={movie.mediaInfo.title}
                          className="w-12 h-18 rounded mr-2 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-18 bg-gray-800 rounded mr-2 flex items-center justify-center text-gray-600">
                          No Image
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{movie.mediaInfo.title}</p>
                        {movie.mediaInfo.releaseDate && (
                          <p className="text-sm text-gray-400">
                            {new Date(movie.mediaInfo.releaseDate).getFullYear()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                {intl.formatMessage(messages.noresults)}
              </div>
            )}
          </div>
        )}
      </div>

      {isLoadingSimilar ? (
        <LoadingSpinner />
      ) : similarMovies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {similarMovies.map((movie) => (
            <TitleCard
              key={movie.id}
              id={movie.id}
              image={movie.poster_path}
              status="available"
              summary={movie.overview}
              title={movie.title}
              year={movie.release_date ? new Date(movie.release_date).getFullYear() : undefined}
              mediaType="movie"
              inProgress={false}
            />
          ))}
        </div>
      ) : selectedMovie ? (
        <div className="text-center text-gray-500 py-8">
          {intl.formatMessage(messages.nomoviesfound)}
        </div>
      ) : null}
    </div>
  );
};

export default SimilarPicker;
