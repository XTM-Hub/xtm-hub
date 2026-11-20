import {
  type CanUnregisterPlatformQueryVariables,
  type IsPlatformRegisteredQueryVariables,
  type RegisteredPlatformByServiceInstanceQueryVariables,
  type RegisteredPlatformsQueryVariables,
  useCanUnregisterPlatformQuery,
  useIsPlatformRegisteredQuery,
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
  isPlatformRegistered: (variables: IsPlatformRegisteredQueryVariables) =>
    useIsPlatformRegisteredQuery.getKey(variables),
  canUnregisterPlatform: (variables: CanUnregisterPlatformQueryVariables) =>
    useCanUnregisterPlatformQuery.getKey(variables),
};
