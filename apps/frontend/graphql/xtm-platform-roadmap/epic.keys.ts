import {
  EpicsQueryVariables,
  useEpicCountPerTimelineQueryQuery,
  useEpicsQuery,
} from '@graphql/generated';

export const epicKeys = {
  countPerTimeline: useEpicCountPerTimelineQueryQuery.getRootKey,
  all: useEpicsQuery.getRootKey,
  list: (variables: EpicsQueryVariables) => useEpicsQuery.getKey(variables),
};
