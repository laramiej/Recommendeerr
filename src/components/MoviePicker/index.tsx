import React, { useState } from 'react';
import PageTitle from '@app/components/Common/PageTitle';
import { Tab } from '@headlessui/react';
import { defineMessages, useIntl } from 'react-intl';
import RandomPicker from './RandomPicker';
import MoodPicker from './MoodPicker';
import AiPicker from './AiPicker';
import SimilarPicker from './SimilarPicker';

const messages = defineMessages({
  moviepicker: 'Movie Picker',
  findamovie: 'Find a Movie to Watch',
  random: 'Random',
  mood: 'By Mood',
  ai: 'AI Recommendations',
  similar: 'Similar Movies',
});

const MoviePicker = () => {
  const intl = useIntl();

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.moviepicker)} />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {intl.formatMessage(messages.findamovie)}
        </h1>
      </div>

      <Tab.Group>
        <Tab.List className="mb-6 flex space-x-2 rounded-xl bg-gray-800 p-1">
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected ? 'bg-indigo-700 shadow' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`
          }>
            {intl.formatMessage(messages.random)}
          </Tab>
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected ? 'bg-indigo-700 shadow' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`
          }>
            {intl.formatMessage(messages.mood)}
          </Tab>
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected ? 'bg-indigo-700 shadow' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`
          }>
            {intl.formatMessage(messages.ai)}
          </Tab>
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected ? 'bg-indigo-700 shadow' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`
          }>
            {intl.formatMessage(messages.similar)}
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            <RandomPicker />
          </Tab.Panel>
          <Tab.Panel>
            <MoodPicker />
          </Tab.Panel>
          <Tab.Panel>
            <AiPicker />
          </Tab.Panel>
          <Tab.Panel>
            <SimilarPicker />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </>
  );
};

export default MoviePicker;
