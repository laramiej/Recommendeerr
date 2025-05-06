import React, { useState } from 'react';
import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import TitleCard from '@app/components/TitleCard';
import axios from 'axios';
import { defineMessages, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages({
  aiheading: 'AI Movie Recommendations',
  promptlabel: 'What kind of movie are you looking for?',
  promptplaceholder: 'e.g., "A sci-fi movie with time travel, similar to Interstellar"',
  getrecommendations: 'Get Recommendations',
  nomoviesfound: 'No movie recommendations found',
  error: 'Error getting AI recommendations',
  notavailable: 'Available in your library',
  notconfigured: 'AI recommendations require an OpenAI API key to be configured in the settings',
});

const AiPicker = () => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const [prompt, setPrompt] = useState('');
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true); // Will be set to false if API returns 400

  const getAiRecommendations = async () => {
    if (!prompt.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/v1/picker/ai-recommend', {
        prompt: prompt,
        count: 5
      });

      setMovies(response.data.results);
      setIsConfigured(true);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('OpenAI API key')) {
        setIsConfigured(false);
      } else {
        addToast(intl.formatMessage(messages.error), {
          appearance: 'error',
          autoDismiss: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {intl.formatMessage(messages.aiheading)}
        </h2>

        {!isConfigured ? (
          <div className="bg-red-800 bg-opacity-20 p-4 rounded-md border border-red-700 text-red-100 mb-4">
            {intl.formatMessage(messages.notconfigured)}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-400 mb-2">
                {intl.formatMessage(messages.promptlabel)}
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-md bg-gray-800 border-gray-700 text-white"
                placeholder={intl.formatMessage(messages.promptplaceholder)}
                rows={3}
              />
            </div>
            <Button
              buttonType="primary"
              onClick={getAiRecommendations}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? <LoadingSpinner /> : intl.formatMessage(messages.getrecommendations)}
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {movies.map((movie, index) => (
            <div key={movie.id} className="relative">
              <TitleCard
                id={movie.id}
                image={movie.poster_path}
                status="available"
                summary={movie.overview}
                title={movie.title}
                year={movie.release_date ? new Date(movie.release_date).getFullYear() : undefined}
                mediaType="movie"
                inProgress={false}
              />
              {/* Show availability badge if the movie is available in library */}
              {Array.isArray(movies.isAvailable) && movies.isAvailable[index] && (
                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  {intl.formatMessage(messages.notavailable)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : prompt && !isLoading ? (
        <div className="text-center text-gray-500 py-8">
          {intl.formatMessage(messages.nomoviesfound)}
        </div>
      ) : null}
    </div>
  );
};

export default AiPicker;
