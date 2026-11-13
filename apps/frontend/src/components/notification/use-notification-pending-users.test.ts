import {
  notificationPendingUserQueryFilters,
  useNotificationPendingUsers,
} from '@/components/notification/use-notification-pending-users';
import {
  FilterKey,
  OrderingMode,
  PendingUsersQuery,
  UserOrdering,
} from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type PendingUsersQueryOptions = {
  enabled: boolean;
  throwOnError: (
    error: Error,
    query: { state: { data: PendingUsersQuery | undefined } }
  ) => boolean;
};

const mocks = vi.hoisted(() => ({
  usePendingUsersQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    usePendingUsersQuery: mocks.usePendingUsersQuery,
  });
});

const ORGANIZATION_ID = 'organization-1';

const PENDING_USERS: PendingUsersQuery = {
  pendingUsers: { totalCount: 0, edges: [] },
};

const lastQueryOptions = () =>
  mocks.usePendingUsersQuery.mock.lastCall?.[2] as PendingUsersQueryOptions;

describe('notificationPendingUserQueryFilters', () => {
  it('should set every variable, null included, for the bell pending users', () => {
    // When
    const variables = notificationPendingUserQueryFilters(ORGANIZATION_ID);

    // Then
    expect(variables).toStrictEqual({
      first: 20,
      after: null,
      orderBy: UserOrdering.LastLogin,
      orderMode: OrderingMode.Asc,
      searchTerm: null,
      filters: [{ key: FilterKey.OrganizationId, value: [ORGANIZATION_ID] }],
    });
  });
});

describe('useNotificationPendingUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePendingUsersQuery.mockReturnValue({ data: undefined });
  });

  it('should load the bell pending users of the organization', () => {
    // When
    renderHook(() => useNotificationPendingUsers(ORGANIZATION_ID));

    // Then
    expect(mocks.usePendingUsersQuery.mock.lastCall?.[1]).toStrictEqual(
      notificationPendingUserQueryFilters(ORGANIZATION_ID)
    );
  });

  it.each([
    { case: 'by default', options: undefined, expected: true },
    { case: 'when asked', options: { enabled: false }, expected: false },
  ])('should set the enabled option $case', ({ options, expected }) => {
    // When
    renderHook(() => useNotificationPendingUsers(ORGANIZATION_ID, options));

    // Then
    expect(lastQueryOptions().enabled).toBe(expected);
  });

  it.each([
    {
      case: 'send the error to the error page when the first load fails',
      data: undefined,
      expected: true,
    },
    {
      case: 'keep the pending users when a background refetch fails',
      data: PENDING_USERS,
      expected: false,
    },
  ])('should $case', ({ data, expected }) => {
    // Given
    renderHook(() => useNotificationPendingUsers(ORGANIZATION_ID));

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data },
    });

    // Then
    expect(shouldThrow).toBe(expected);
  });
});
