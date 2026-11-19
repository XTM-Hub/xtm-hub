import UserList from '@/components/admin/user/UserList';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { INVALIDATION_BATCH_MAX_WAIT_MS } from '@/hooks/use-batched-invalidation';
import testRender from '@/utils/test/test-render';
import {
  AdminUserEventsDocument,
  AdminUserEventsSubscription,
  UsersListDocument,
  UsersListQuery,
} from '@graphql/generated';
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  onAdminUserEvent: undefined as
    ((data: AdminUserEventsSubscription) => void) | undefined,
}));

// The real users list query runs, against a mocked network.
vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { request: mocks.request },
}));

// The new users are announced by the test, on the bypass admin path.
vi.mock('@/hooks/use-graphql-subscription', () => ({
  useGraphqlSubscription: (
    document: string,
    _variables: unknown,
    { onNext }: { onNext: (data: AdminUserEventsSubscription) => void }
  ) => {
    if (document === AdminUserEventsDocument) {
      mocks.onAdminUserEvent = onNext;
    }
  },
}));

vi.mock('@/hooks/use-admin-path', () => ({
  default: () => true,
}));

vi.mock('@/components/admin/user/forms/admin/AdminAddUser', () => ({
  AdminAddUser: () => null,
}));

vi.mock('@/components/admin/user/UserOrganizationFilter', () => ({
  UserOrganizationFilter: () => null,
}));

// The table is not under test: it only shows the users.
vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({ data }: { data: UsersListUser[] }) => (
    <div>
      {data.map((row) => (
        <span key={row.id}>{row.email}</span>
      ))}
    </div>
  ),
  DataTableHeadBarOptions: () => null,
}));

const ADDED_USERS_COUNT = 20;

const USER: UsersListUser = {
  id: 'user-1',
  email: 'ada.lovelace@filigran.io',
  first_name: 'Ada',
  last_name: 'Lovelace',
  disabled: false,
  last_login: null,
  country: null,
  status: null,
  invitation_date: null,
  organization_capabilities: [],
};

const USERS: UsersListQuery = {
  users: { totalCount: 1, edges: [{ node: USER }] },
};

const usersListRequestsCount = () =>
  mocks.request.mock.calls.filter(
    ([{ document }]) => document === UsersListDocument
  ).length;

describe('UserList cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.request.mockResolvedValue(USERS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reload the users once when many users are added at once', async () => {
    // Given
    testRender(<UserList />);
    // vi.waitFor moves the fake timers itself; findBy would rely on the global
    // jest object, which only the Relay test utilities provide.
    await vi.waitFor(() =>
      expect(screen.getByText(USER.email)).toBeInTheDocument()
    );
    expect(usersListRequestsCount()).toBe(1);

    // When
    act(() => {
      for (let event = 0; event < ADDED_USERS_COUNT; event += 1) {
        mocks.onAdminUserEvent!({
          AdminUser: { add: { id: `new-user-${event}` } },
        });
      }
    });
    await act(() =>
      vi.advanceTimersByTimeAsync(INVALIDATION_BATCH_MAX_WAIT_MS)
    );

    // Then
    expect(usersListRequestsCount()).toBe(2);
  });
});
