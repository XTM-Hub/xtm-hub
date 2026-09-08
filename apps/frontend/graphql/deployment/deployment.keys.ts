import {
  type TrialsListQueryVariables,
  type TrialsQuotasQueryVariables,
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
  list: (variables: TrialsQuotasQueryVariables) =>
    useTrialsQuotasQuery.getKey(variables),
};

export const xtmPlatformBundleKeys = {
  all: useXtmPlatformBundleQuery.getRootKey,
};
