import {
  type AdminRegisteredPlatformsQueryVariables,
  useAdminRegisteredPlatformsQuery,
} from '@graphql/generated';

export const adminRegisteredPlatformsKeys = {
  all: useAdminRegisteredPlatformsQuery.getRootKey,
  list: (variables: AdminRegisteredPlatformsQueryVariables) =>
    useAdminRegisteredPlatformsQuery.getKey(variables),
};
