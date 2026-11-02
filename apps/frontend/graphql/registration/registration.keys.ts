import {
  type RegisteredPlatformsQueryVariables,
  useRegisteredPlatformsQuery,
} from '@graphql/generated';

export const registrationKeys = {
  all: useRegisteredPlatformsQuery.getRootKey,
  registeredPlatforms: (variables: RegisteredPlatformsQueryVariables) =>
    useRegisteredPlatformsQuery.getKey(variables),
};
