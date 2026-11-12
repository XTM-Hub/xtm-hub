import { useRefreshUsersList } from '@/components/admin/user/use-refresh-users-list';
import { usersListKeys } from '@graphql/user/users.keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

describe('useRefreshUsersList', () => {
  it('should invalidate every cached page of the users list', () => {
    // Given
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();
    const { result } = renderHook(() => useRefreshUsersList(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    });

    // When
    result.current();

    // Then
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({
      queryKey: usersListKeys.all(),
    });
  });
});
