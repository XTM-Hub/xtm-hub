import { usersListKeys } from '@graphql/user/users.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Reloads the users list after a user mutation. The forms do not know the
 * variables of the list on screen, so every cached page is invalidated: only
 * the one on screen reloads now, the others when they are shown again.
 */
export const useRefreshUsersList = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: usersListKeys.all() });
  }, [queryClient]);
};
