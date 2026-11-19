import UserList from '@/components/admin/user/UserList';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { createQueryClient } from '@/lib/query-client';
import testRender from '@/utils/test/test-render';
import { UsersListDocument, UsersListQuery } from '@graphql/generated';
import { PaginationState } from '@tanstack/react-table';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

// The real users list query runs, against a mocked network.
vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { request: mocks.request },
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

// The table is not under test: it shows the users and moves between pages.
vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({
    data,
    tableOptions,
  }: {
    data: UsersListUser[];
    tableOptions: {
      onPaginationChange: (
        updater: (previous: PaginationState) => PaginationState
      ) => void;
    };
  }) => (
    <div>
      {data.map((row) => (
        <span key={row.id}>{row.email}</span>
      ))}
      <button
        onClick={() =>
          tableOptions.onPaginationChange((previous) => ({
            ...previous,
            pageIndex: previous.pageIndex + 1,
          }))
        }>
        Next page
      </button>
      <button
        onClick={() =>
          tableOptions.onPaginationChange((previous) => ({
            ...previous,
            pageIndex: previous.pageIndex - 1,
          }))
        }>
        Previous page
      </button>
    </div>
  ),
  DataTableHeadBarOptions: () => null,
}));

const FIRST_PAGE_CURSOR = btoa(String(0));

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

const firstPageRequestsCount = () =>
  mocks.request.mock.calls.filter(
    ([{ document, variables }]) =>
      document === UsersListDocument && variables.after === FIRST_PAGE_CURSOR
  ).length;

// The client of the app, whose queries stay fresh for a while unless they say
// otherwise.
const renderLoadedUserList = async () => {
  const queryClient = createQueryClient();
  const rendered = testRender(<UserList />, { queryClient });
  expect(await screen.findByText(USER.email)).toBeInTheDocument();
  expect(firstPageRequestsCount()).toBe(1);
  return { queryClient, ...rendered };
};

describe('UserList refetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.request.mockResolvedValue(USERS);
  });

  it('should reload a page of users already loaded when the user comes back to it', async () => {
    // Given
    const { user } = await renderLoadedUserList();
    await user.click(screen.getByRole('button', { name: 'Next page' }));

    // When
    await user.click(screen.getByRole('button', { name: 'Previous page' }));

    // Then
    await vi.waitFor(() => expect(firstPageRequestsCount()).toBe(2));
  });

  it('should reload the users when the list is shown again', async () => {
    // Given
    const { queryClient, unmount } = await renderLoadedUserList();
    unmount();

    // When
    testRender(<UserList />, { queryClient });

    // Then
    await vi.waitFor(() => expect(firstPageRequestsCount()).toBe(2));
  });

  it('should not reload the users when the user comes back to the browser tab', async () => {
    // Given
    await renderLoadedUserList();

    // When
    await act(async () => {
      window.dispatchEvent(new Event('visibilitychange'));
    });

    // Then
    expect(firstPageRequestsCount()).toBe(1);
  });
});
