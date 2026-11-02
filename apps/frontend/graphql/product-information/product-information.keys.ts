import {
  type RegisteredSaasPlatformDataQueryVariables,
  useRegisteredSaasPlatformDataQuery,
} from '@graphql/generated';

export const productInformationKeys = {
  registeredSaasPlatformData: (
    variables: RegisteredSaasPlatformDataQueryVariables
  ) => useRegisteredSaasPlatformDataQuery.getKey(variables),
};
