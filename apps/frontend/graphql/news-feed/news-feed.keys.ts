import { useNewsFeedListQuery } from '@graphql/generated';

export const newsFeedKeys = {
  all: useNewsFeedListQuery.getRootKey,
};
