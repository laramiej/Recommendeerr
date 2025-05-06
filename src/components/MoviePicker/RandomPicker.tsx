import React, { useState } from 'react';
import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import TitleCard from '@app/components/TitleCard';
import axios from 'axios';
import { defineMessages, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages({
  getnewrandom: 'Get New Suggestions',
  nomoviefound: 'No movies found in your library',
  randomsuggestions: 'Random Suggestions',
  error: 'Error loading random movies',
});

const RandomPicker = () => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getRandomMovies = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/v1/picker/random?count=5');
      setMovies(response.data);
    } catch (error) {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {intl.formatMessage(messages.randomsuggestions)}
        </h2>
        <Button buttonType="primary" onClick={getRandomMovies} disabled={isLoading}>
          {isLoading ? <LoadingSpinner /> : intl.formatMessage(messages.getnewrandom)}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <TitleCard
              key={movie.id}
              id={movie.tmdbId}
              image={movie.details.poster_path}
              status={movie.status}
              summary={movie.details.overview}
              title={movie.details.title}
              year={new Date(movie.details.release_date).getFullYear()}
              mediaType="movie"
              inProgress={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          {intl.formatMessage(messages.nomoviefound)}
        </div>
      )}
    </div>
  );
};

export default RandomPicker;
