import { useApiTokensQuery } from '@graphql/generated';

export const apiTokenKeys = {
  all: useApiTokensQuery.getRootKey,
  list: () => useApiTokensQuery.getKey(),
};
