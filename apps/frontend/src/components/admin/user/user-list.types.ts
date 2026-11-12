import { UsersListQuery } from '@graphql/generated';

export type UsersListUser = UsersListQuery['users']['edges'][number]['node'];
