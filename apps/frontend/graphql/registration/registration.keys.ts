import {
  type RegisteredPlatformByServiceInstanceQueryVariables,
  type RegisteredPlatformsQueryVariables,
  useRegisteredPlatformByServiceInstanceQuery,
  useRegisteredPlatformsQuery,
} from '@graphql/generated';

/**
 * Each `all*` root covers one query only: there is no root for every
 * registration query at once.
 */
export const registrationKeys = {
  allRegisteredPlatforms: useRegisteredPlatformsQuery.getRootKey,
  registeredPlatforms: (variables: RegisteredPlatformsQueryVariables) =>
    useRegisteredPlatformsQuery.getKey(variables),
  allByServiceInstance: useRegisteredPlatformByServiceInstanceQuery.getRootKey,
  byServiceInstance: (
    variables: RegisteredPlatformByServiceInstanceQueryVariables
  ) => useRegisteredPlatformByServiceInstanceQuery.getKey(variables),
};
