import {
  type SaasManagerPlatformsListQueryVariables,
  useSaasManagerPlatformsListQuery,
} from '@graphql/generated';

export const saasPlatformsKeys = {
  all: useSaasManagerPlatformsListQuery.getRootKey,
  list: (variables: SaasManagerPlatformsListQueryVariables) =>
    useSaasManagerPlatformsListQuery.getKey(variables),
};
