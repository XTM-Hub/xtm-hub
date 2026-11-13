import {
  type PendingUsersQueryVariables,
  type UsersListQueryVariables,
  type UsersQueryVariables,
  usePendingUsersQuery,
  useUsersListQuery,
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

export const usersListKeys = {
  all: useUsersListQuery.getRootKey,
  list: (variables: UsersListQueryVariables) =>
    useUsersListQuery.getKey(variables),
};
