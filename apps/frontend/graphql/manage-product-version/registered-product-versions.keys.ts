import {
  type RegisteredProductVersionsListQueryVariables,
  useRegisteredProductVersionsListQuery,
} from '@graphql/generated';

export const registeredProductVersionsKeys = {
  all: useRegisteredProductVersionsListQuery.getRootKey,
  list: (variables: RegisteredProductVersionsListQueryVariables) =>
    useRegisteredProductVersionsListQuery.getKey(variables),
};
