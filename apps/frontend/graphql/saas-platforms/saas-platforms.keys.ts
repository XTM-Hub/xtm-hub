import {
  type SaasPlatformsListQueryVariables,
  useSaasPlatformsListQuery,
} from '@graphql/generated';

export const saasPlatformsKeys = {
  all: useSaasPlatformsListQuery.getRootKey,
  list: (variables: SaasPlatformsListQueryVariables) =>
    useSaasPlatformsListQuery.getKey(variables),
};
