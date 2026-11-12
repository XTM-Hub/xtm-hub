import UserListPage from '@/components/admin/user/UserListPage';
import { NotificationButton } from '@/components/notification/NotificationButton';
import { notificationPendingUserQueryFilters } from '@/components/notification/use-notification-pending-users';
import testRender from '@/utils/test/test-render';
import { PendingUsersQuery } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
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
});
