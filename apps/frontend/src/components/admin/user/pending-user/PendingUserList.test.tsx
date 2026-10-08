import testRender from '@/utils/test/test-render';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PendingUserList from './PendingUserList';

const mocks = vi.hoisted(() => ({
  setPageSize: vi.fn(),
  useSubscription: vi.fn(),
  refetch: vi.fn(),
  pendingUsers: [] as UserList_fragment$data[],
}));

vi.mock(
  '@/components/admin/user/pending-user/pending-user-list-localstorage',
  () => ({
    useUserListLocalstorage: () => ({
      pageSize: 10,
      setPageSize: mocks.setPageSize,
      orderMode: 'asc',
      setOrderMode: vi.fn(),
      orderBy: 'EMAIL',
      setOrderBy: vi.fn(),
      columnOrder: ['email', 'first_name', 'last_name', 'actions'],
      setColumnOrder: vi.fn(),
      columnVisibility: {},
      setColumnVisibility: vi.fn(),
      resetAll: vi.fn(),
      removeOrder: vi.fn(),
    }),
  })
);

vi.mock(
  '@/components/admin/user/pending-user/use-pending-user-actions',
  () => ({
    usePendingUserActions: () => ({
      approveUser: vi.fn(),
      rejectUser: vi.fn(),
      handleBulkApprove: vi.fn(),
      handleBulkReject: vi.fn(),
    }),
  })
);

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useLazyLoadQuery: () => ({}),
  useRefetchableFragment: () => [
    {
      pendingUsers: {
        __id: 'pending-users-connection-id',
        totalCount: mocks.pendingUsers.length,
        edges: mocks.pendingUsers.map((node) => ({ node })),
      },
    },
    mocks.refetch,
  ],
  readInlineData: (_fragment: unknown, node: unknown) => node,
  useSubscription: (config: unknown) => mocks.useSubscription(config),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    open,
    onOpenChange,
    title,
    confirmLabel,
    onConfirm,
    children,
    trigger,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    confirmLabel: string;
    onConfirm?: () => void;
    children: ReactNode;
    trigger?: ReactNode;
  }) => (
    <div>
      {trigger}
      {open ? (
        <div role="alertdialog">
          <h2>{title}</h2>
          <div>{children}</div>
          <button onClick={onConfirm}>{confirmLabel}</button>
          <button onClick={() => onOpenChange?.(false)}>Close dialog</button>
        </div>
      ) : null}
    </div>
  ),
}));

vi.mock('@filigran/icon', () => ({
  CheckIcon: () => <span aria-label="approve-icon">approve</span>,
  CloseIcon: () => <span aria-label="reject-icon">reject</span>,
}));

vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (
    callback: (event: { target: { value: string } }) => void
  ) =>
    Object.assign((event: { target: { value: string } }) => callback(event), {
      cancel: vi.fn(),
    }),
}));

vi.mock('@filigran/ui', () => ({
  DataTable: ({
    columns,
    data,
    toolbar,
    tableOptions,
  }: {
    columns: Array<{
      id?: string;
      cell?: (props: {
        row: { original: UserList_fragment$data };
      }) => ReactNode;
    }>;
    data: UserList_fragment$data[];
    toolbar?: ReactNode;
    tableOptions?: {
      onPaginationChange?: (updater: unknown) => void;
    };
  }) => {
    const actionColumn = columns.find((column) => column.id === 'actions');

    return (
      <div>
        {data.map((row) => (
          <div
            key={row.id}
            data-testid={`row-${row.id}`}>
            <span>{row.email}</span>
            {actionColumn?.cell?.({ row: { original: row } })}
          </div>
        ))}
        {toolbar}
        <button
          onClick={() =>
            tableOptions?.onPaginationChange?.({
              pageIndex: 0,
              pageSize: 20,
            })
          }>
          Change pagination
        </button>
      </div>
    );
  },
  DataTableHeadBarOptions: () => <div>headbar-options</div>,
  useRowSelection: () => ({
    clearSelection: vi.fn(),
  }),
}));

const pendingUsers = [
  {
    id: 'pending-1',
    email: 'first.pending@filigran.io',
    first_name: 'First',
    last_name: 'Pending',
  },
  {
    id: 'pending-2',
    email: 'second.pending@filigran.io',
    first_name: 'Second',
    last_name: 'Pending',
  },
] as UserList_fragment$data[];

describe('PendingUserList', () => {
  beforeEach(() => {
    mocks.setPageSize.mockReset();
    mocks.useSubscription.mockReset();
    mocks.refetch.mockReset();
    mocks.pendingUsers = pendingUsers;
  });

  it('should subscribe to pending user events with the list connection id', () => {
    testRender(<PendingUserList organization="org-1" />);

    expect(mocks.useSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          connections: ['pending-users-connection-id'],
          organizationId: 'org-1',
        },
      })
    );
  });

  it('should persist changed page size when pagination changes', async () => {
    const { user } = testRender(<PendingUserList organization="org-1" />);

    await user.click(screen.getByRole('button', { name: 'Change pagination' }));

    expect(mocks.setPageSize).toHaveBeenCalledWith(20);
    expect(mocks.refetch).toHaveBeenCalledWith(
      expect.objectContaining({ count: 20 })
    );
  });

  it('should not refetch pending users when pressing Escape in the empty search field', async () => {
    // Given
    const { user } = testRender(<PendingUserList organization="org-1" />);

    // When
    await user.type(
      screen.getByPlaceholderText('UserActions.SearchUser'),
      '{Escape}'
    );

    // Then
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('renders pending users and opens confirm dialog when action buttons are clicked', async () => {
    const { user } = testRender(<PendingUserList organization="org-1" />);

    const firstRow = screen.getByTestId('row-pending-1');
    expect(
      within(firstRow).getByText('first.pending@filigran.io')
    ).toBeInTheDocument();
    expect(screen.getByText('second.pending@filigran.io')).toBeInTheDocument();

    await user.click(within(firstRow).getByLabelText('approve-icon'));
    expect(
      await screen.findByText('PendingUserListPage.WarningUserAccept.Title')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));

    await user.click(within(firstRow).getByLabelText('reject-icon'));
    expect(
      await screen.findByText('PendingUserListPage.WarningUserRejection.Title')
    ).toBeInTheDocument();
  });
});
