import {
  type TrialsListQueryVariables,
  useTrialsListQuery,
  useTrialsQuotasQuery,
  useXtmPlatformBundleQuery,
} from '@graphql/generated';

export const trialsKeys = {
  all: useTrialsListQuery.getRootKey,
  list: (variables: TrialsListQueryVariables) =>
    useTrialsListQuery.getKey(variables),
};

export const trialsQuotasKeys = {
  all: useTrialsQuotasQuery.getRootKey,
  list: () => useTrialsQuotasQuery.getKey(),
};

export const xtmPlatformBundleKeys = {
  all: useXtmPlatformBundleQuery.getRootKey,
};
