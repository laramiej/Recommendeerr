import React, { useState } from 'react';
import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import TitleCard from '@app/components/TitleCard';
import axios from 'axios';
import { defineMessages, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages({
  selectmood: 'Select your mood',
  nomoviesfound: 'No movies found for this mood',
  happy: 'Happy',
  sad: 'Sad',
  excited: 'Excited',
  relaxed: 'Relaxed',
  scared: 'Scared',
  error: 'Error loading movies for this mood',
});

const moods = [
  { id: 'happy', icon: '😊', label: messages.happy },
  { id: 'sad', icon: '😢', label: messages.sad },
  { id: 'excited', icon: '🤩', label: messages.excited },
  { id: 'relaxed', icon: '😌', label: messages.relaxed },
  { id: 'scared', icon: '😱', label: messages.scared },
];

const MoodPicker = () => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const [selectedMood, setSelectedMood] = useState('');
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getMoodBasedMovies = async (mood: string) => {
    setIsLoading(true);
    setSelectedMood(mood);
    try {
      const response = await axios.get(`/api/v1/picker/mood/${mood}`);
      setMovies(response.data.results);
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {intl.formatMessage(messages.selectmood)}
        </h2>
        <div className="flex flex-wrap gap-4">
          {moods.map((mood) => (
            <Button
              key={mood.id}
              buttonType={selectedMood === mood.id ? 'primary' : 'default'}
              onClick={() => getMoodBasedMovies(mood.id)}
              className="text-lg px-6 py-3"
            >
              <span className="mr-2 text-xl">{mood.icon}</span>
              <span>{intl.formatMessage(mood.label)}</span>
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <TitleCard
              key={movie.id}
              id={movie.id}
              image={movie.poster_path}
              status="available"
              summary={movie.overview}
              title={movie.title}
              year={new Date(movie.release_date).getFullYear()}
              mediaType="movie"
              inProgress={false}
            />
          ))}
        </div>
      ) : selectedMood ? (
        <div className="text-center text-gray-500 py-8">
          {intl.formatMessage(messages.nomoviesfound)}
        </div>
      ) : null}
    </div>
  );
};

export default MoodPicker;
