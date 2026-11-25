import UserListPage from '@/components/admin/user/UserListPage';
import { NotificationButton } from '@/components/notification/NotificationButton';
import { notificationPendingUserQueryFilters } from '@/components/notification/use-notification-pending-users';
import { INVALIDATION_BATCH_MAX_WAIT_MS } from '@/hooks/use-batched-invalidation';
import testRender from '@/utils/test/test-render';
import {
  PendingUserEventsSubscription,
  PendingUsersQuery,
} from '@graphql/generated';
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  onPendingUserEvent: undefined as
    ((data: PendingUserEventsSubscription) => void) | undefined,
}));

// The events are sent by the test.
vi.mock('@/hooks/use-graphql-subscription', () => ({
  useGraphqlSubscription: (
    _document: string,
    _variables: unknown,
    { onNext }: { onNext: (data: PendingUserEventsSubscription) => void }
  ) => {
    mocks.onPendingUserEvent = onNext;
  },
}));

// The real pending users query runs, against a mocked network.
vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { request: mocks.request },
}));

vi.mock('@/components/admin/user/UserList', () => ({
  __esModule: true,
  default: () => <div>UserList</div>,
}));

vi.mock('@/components/admin/user/pending-user/PendingUserList', () => ({
  __esModule: true,
  default: () => <div>PendingUserList</div>,
}));

// The organization selected by the user testRender provides.
const SELECTED_ORGANIZATION_ID = 'org-test-456';
// The red dot of the bell, shown when there are pending users.
const PENDING_BADGE_SELECTOR = '.bg-feedback-error-primary';

const DELETION_EVENTS_COUNT = 20;

const PENDING_USERS: PendingUsersQuery = {
  pendingUsers: {
    totalCount: 1,
    edges: [
      {
        node: {
          id: 'pending-user-1',
          email: 'john.doe@test.io',
          first_name: 'John',
          last_name: 'Doe',
        },
      },
    ],
  },
};

describe('NotificationButton cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.request.mockResolvedValue(PENDING_USERS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load the pending users once for the bell and the pending users tab', async () => {
    // When
    const { container } = testRender(
      <>
        <NotificationButton />
        <UserListPage organization={SELECTED_ORGANIZATION_ID} />
      </>
    );

    // Then
    expect(
      await screen.findByText('PendingUserListPage.TabTitle')
    ).toBeInTheDocument();
    expect(container.querySelector(PENDING_BADGE_SELECTOR)).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        variables: notificationPendingUserQueryFilters(
          SELECTED_ORGANIZATION_ID
        ),
      })
    );
  });

  it('should reload the pending users once when many of them are deleted at once', async () => {
    // Given
    vi.useFakeTimers();
    const { container } = testRender(<NotificationButton />);
    await vi.waitFor(() =>
      expect(
        container.querySelector(PENDING_BADGE_SELECTOR)
      ).toBeInTheDocument()
    );
    expect(mocks.request).toHaveBeenCalledOnce();

    // When
    act(() => {
      for (let event = 0; event < DELETION_EVENTS_COUNT; event += 1) {
        mocks.onPendingUserEvent!({
          UserPending: { delete: { id: `pending-user-${event}` } },
        });
      }
    });
    await act(() =>
      vi.advanceTimersByTimeAsync(INVALIDATION_BATCH_MAX_WAIT_MS)
    );

    // Then
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
});
