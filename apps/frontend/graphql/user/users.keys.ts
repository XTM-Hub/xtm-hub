import {
  type PendingUsersQueryVariables,
  type UsersQueryVariables,
  usePendingUsersQuery,
  useUsersQuery,
} from '@graphql/generated';

export const usersKeys = {
  all: useUsersQuery.getRootKey,
  list: (variables: UsersQueryVariables) => useUsersQuery.getKey(variables),
};

export const pendingUsersKeys = {
  all: usePendingUsersQuery.getRootKey,
  list: (variables: PendingUsersQueryVariables) =>
    usePendingUsersQuery.getKey(variables),
};
