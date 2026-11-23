import type { CurrentUserFragment, MeQuery } from '@graphql/generated';
import { meKeys } from '@graphql/me/me.keys';
import type { QueryClient } from '@tanstack/react-query';

export const setCurrentUser = (
  queryClient: QueryClient,
  user: CurrentUserFragment
) => queryClient.setQueryData<MeQuery>(meKeys.detail(), { me: user });
