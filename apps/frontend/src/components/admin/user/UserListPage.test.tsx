import { screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useAdminPath from '@/hooks/use-admin-path';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { useTranslations } from 'next-intl';
import UserListPage from './UserListPage';

const mocks = vi.hoisted(() => ({
  useNotificationPendingUsers: vi.fn(),
}));

vi.mock('@/hooks/use-admin-path', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

vi.mock('@/components/admin/user/UserList', () => ({
  __esModule: true,
  default: ({ organization }: { organization?: string }) => (
    <div>UserList:{organization}</div>
  ),
}));

vi.mock('@/components/admin/user/pending-user/PendingUserList', () => ({
  __esModule: true,
  default: ({ organization }: { organization: string }) => (
    <div>PendingUserList:{organization}</div>
  ),
}));

vi.mock('@filigran/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/design-system')>()),
  Tabs: ({
    defaultValue,
    children,
  }: {
    defaultValue: string;
    children: ReactNode;
  }) => (
    <div>
      <span data-testid="selected-tab">{defaultValue}</span>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    disabled,
    value,
  }: {
    children: ReactNode;
    disabled?: boolean;
    value: string;
  }) => (
    <button
      disabled={disabled}
      data-testid={`tab-${value}`}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

vi.mock('@/components/notification/use-notification-pending-users', () => ({
  useNotificationPendingUsers: mocks.useNotificationPendingUsers,
}));

const SELECTED_ORGANIZATION_ID = 'org-test-456';
const LOADER_TEST_ID = 'loader';
const PENDING_USERS_COUNT = 3;

const withPendingUsersCount = (totalCount: number) => ({
  data: { pendingUsers: { totalCount, edges: [] } },
});

describe('UserListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminPath).mockReturnValue(false);
    mocks.useNotificationPendingUsers.mockReturnValue(withPendingUsersCount(0));
  });

  it('selects pending users tab when URL has pending action params', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('action=approve&user_id=user-1') as never
    );
    mocks.useNotificationPendingUsers.mockReturnValue(withPendingUsersCount(3));

    testRender(<UserListPage organization="org-1" />);

    expect(screen.getByTestId('selected-tab')).toHaveTextContent(
      'pendingUsers'
    );
    expect(screen.getByText('PendingUserList:org-1')).toBeInTheDocument();
  });

  it('selects users tab by default and disables pending tab when no pending users', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('') as never
    );
    testRender(<UserListPage organization="org-2" />);

    expect(screen.getByTestId('selected-tab')).toHaveTextContent('users');
    expect(screen.getByTestId('tab-pendingUsers')).toBeDisabled();
  });

  it('should open the pending users tab with their count when some users are pending', () => {
    // Given
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
    mocks.useNotificationPendingUsers.mockReturnValue(
      withPendingUsersCount(PENDING_USERS_COUNT)
    );

    // When
    testRender(<UserListPage organization="org-1" />);

    // Then
    const pendingUsersTab = screen.getByTestId('tab-pendingUsers');
    expect(pendingUsersTab).toBeEnabled();
    expect(pendingUsersTab).toHaveTextContent(
      translateWithValues('PendingUserListPage.TabTitle', {
        usersCount: PENDING_USERS_COUNT,
      })
    );
  });

  it('should load the pending users count of the selected organization', () => {
    // When
    testRender(<UserListPage organization="org-1" />);

    // Then
    expect(mocks.useNotificationPendingUsers).toHaveBeenCalledWith(
      SELECTED_ORGANIZATION_ID,
      { enabled: true }
    );
  });

  it('should show the loader until the pending users count is loaded', () => {
    // Given
    mocks.useNotificationPendingUsers.mockReturnValue({ data: undefined });

    // When
    testRender(<UserListPage organization="org-1" />);

    // Then
    expect(screen.getByTestId(LOADER_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByText('UserList:org-1')).not.toBeInTheDocument();
  });

  it('should show the users at once without loading the pending users on the admin path', () => {
    // Given
    vi.mocked(useAdminPath).mockReturnValue(true);
    mocks.useNotificationPendingUsers.mockReturnValue({ data: undefined });

    // When
    testRender(<UserListPage />);

    // Then
    expect(mocks.useNotificationPendingUsers).toHaveBeenCalledWith(
      SELECTED_ORGANIZATION_ID,
      { enabled: false }
    );
    expect(screen.queryByTestId(LOADER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByText('UserList:')).toBeInTheDocument();
  });
});
