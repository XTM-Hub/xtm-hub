import {
  type RegisteredPlatformsQueryVariables,
  type RegisteredSaasPlatformMetadataQueryVariables,
  useRegisteredPlatformsQuery,
  useRegisteredSaasPlatformMetadataQuery,
} from '@graphql/generated';

export const registrationKeys = {
  all: useRegisteredPlatformsQuery.getRootKey,
  registeredPlatforms: (variables: RegisteredPlatformsQueryVariables) =>
    useRegisteredPlatformsQuery.getKey(variables),
  registeredSaasPlatformMetadata: (
    variables: RegisteredSaasPlatformMetadataQueryVariables
  ) => useRegisteredSaasPlatformMetadataQuery.getKey(variables),
};
