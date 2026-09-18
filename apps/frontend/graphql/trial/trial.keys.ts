import {
  type PlatformTrialStatusQueryVariables,
  usePlatformTrialStatusQuery,
} from '@graphql/generated';

export const platformTrialKeys = {
  platformTrialStatusAll: usePlatformTrialStatusQuery.getRootKey,
  platformTrialStatus: (variables: PlatformTrialStatusQueryVariables) =>
    usePlatformTrialStatusQuery.getKey(variables),
};
