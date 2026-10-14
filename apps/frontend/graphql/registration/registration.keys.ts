import {
  type RegisteredPlatformsQueryVariables,
  type RegisteredSaasPlatformMetadataQueryVariables,
  type RegisteredSaasPlatformMetricsQueryVariables,
  useRegisteredPlatformsQuery,
  useRegisteredSaasPlatformMetadataQuery,
  useRegisteredSaasPlatformMetricsQuery,
} from '@graphql/generated';

export const registrationKeys = {
  all: useRegisteredPlatformsQuery.getRootKey,
  registeredPlatforms: (variables: RegisteredPlatformsQueryVariables) =>
    useRegisteredPlatformsQuery.getKey(variables),
  registeredSaasPlatformMetadata: (
    variables: RegisteredSaasPlatformMetadataQueryVariables
  ) => useRegisteredSaasPlatformMetadataQuery.getKey(variables),
  registeredSaasPlatformMetrics: (
    variables: RegisteredSaasPlatformMetricsQueryVariables
  ) => useRegisteredSaasPlatformMetricsQuery.getKey(variables),
};
