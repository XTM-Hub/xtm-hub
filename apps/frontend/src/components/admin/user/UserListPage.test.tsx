import { screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import testRender from '@/utils/test/test-render';
import UserListPage from './UserListPage';

const mocks = vi.hoisted(() => ({
  pendingUsersTotalCount: 0,
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

vi.mock('@/components/admin/user/forms/AddUser', () => ({
  AddUser: () => <div>AddUser</div>,
}));

vi.mock('@/components/admin/user/forms/admin/AdminAddUser', () => ({
  AdminAddUser: () => <div>AdminAddUser</div>,
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

vi.mock('@/components/notification/NotificationButton', () => ({
  notificationPendingUserQueryFilters: vi.fn(() => ({
    count: 20,
    filters: [],
    orderBy: 'last_login',
    orderMode: 'asc',
  })),
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useLazyLoadQuery: () => ({}),
  useRefetchableFragment: () => [
    {
      pendingUsers: {
        totalCount: mocks.pendingUsersTotalCount,
      },
    },
    vi.fn(),
  ],
}));

describe('UserListPage', () => {
  beforeEach(() => {
    mocks.pendingUsersTotalCount = 0;
  });

  it('selects pending users tab when URL has pending action params', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('action=approve&user_id=user-1') as never
    );
    mocks.pendingUsersTotalCount = 3;

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
});
