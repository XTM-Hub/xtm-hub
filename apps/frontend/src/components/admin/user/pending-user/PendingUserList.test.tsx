import { PendingUser } from '@/components/admin/user/pending-user/pending-user-list.types';
import { SelectionState } from '@/components/ui/data-table';
import { toCursor } from '@/hooks/use-table-pagination';
import testRender from '@/utils/test/test-render';
import {
  FilterKey,
  OrderingMode,
  PendingUserAcceptMutation,
  PendingUserEventsDocument,
  PendingUserEventsSubscription,
  PendingUsersQuery,
  PendingUsersQueryVariables,
  UserOrdering,
} from '@graphql/generated';
import { pendingUsersKeys } from '@graphql/user/users.keys';
import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import { act, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PendingUserList from './PendingUserList';

type MutationCallbacks = {
  onSuccess: (response: unknown, variables: unknown) => void;
  onError: (error: Error) => void;
};

type PendingUserMutation = 'approve' | 'reject' | 'bulkApprove' | 'bulkReject';

type PendingUsersQueryOptions = {
  placeholderData: unknown;
  throwOnError: (
    error: Error,
    query: { state: { data: PendingUsersQuery | undefined } }
  ) => boolean;
};

type SubscriptionOptions = {
  onNext: (data: PendingUserEventsSubscription) => void;
};

const mocks = vi.hoisted(() => ({
  setPageSize: vi.fn(),
  clearSelection: vi.fn(),
  pendingUsersQuery: vi.fn(),
  useGraphqlSubscription: vi.fn(),
  approveMutate: vi.fn(),
  rejectMutate: vi.fn(),
  bulkApproveMutate: vi.fn(),
  bulkRejectMutate: vi.fn(),
  // The outcome callbacks are given to the mutation hooks, not to mutate.
  mutationCallbacks: {} as Record<string, unknown>,
}));

vi.mock(
  '@/components/admin/user/pending-user/pending-user-list-localstorage',
  async () => {
    const { OrderingMode, UserOrdering } = await import('@graphql/generated');
    return {
      useUserListLocalstorage: () => ({
        pageSize: 10,
        setPageSize: mocks.setPageSize,
        orderMode: OrderingMode.Asc,
        setOrderMode: vi.fn(),
        orderBy: UserOrdering.Email,
        setOrderBy: vi.fn(),
        columnOrder: ['email', 'first_name', 'last_name', 'actions'],
        setColumnOrder: vi.fn(),
        columnVisibility: {},
        setColumnVisibility: vi.fn(),
        resetAll: vi.fn(),
        removeOrder: vi.fn(),
      }),
    };
  }
);

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      usePendingUsersQuery: mocks.pendingUsersQuery,
    })),
    usePendingUserAcceptMutation: (_client: unknown, callbacks: unknown) => {
      mocks.mutationCallbacks.approve = callbacks;
      return { mutate: mocks.approveMutate };
    },
    usePendingUserRemoveMutation: (_client: unknown, callbacks: unknown) => {
      mocks.mutationCallbacks.reject = callbacks;
      return { mutate: mocks.rejectMutate };
    },
    usePendingUsersBulkAcceptMutation: (
      _client: unknown,
      callbacks: unknown
    ) => {
      mocks.mutationCallbacks.bulkApprove = callbacks;
      return { mutate: mocks.bulkApproveMutate };
    },
    usePendingUsersBulkRemoveMutation: (
      _client: unknown,
      callbacks: unknown
    ) => {
      mocks.mutationCallbacks.bulkReject = callbacks;
      return { mutate: mocks.bulkRejectMutate };
    },
  };
});

vi.mock('@/hooks/use-graphql-subscription', () => ({
  useGraphqlSubscription: mocks.useGraphqlSubscription,
}));

vi.mock('@/components/admin/user/forms/AddUser', () => ({
  AddUser: () => <div>AddUser</div>,
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
      {/* An uncontrolled dialog (the bulk ones) only exposes its confirmation. */}
      {open === undefined ? (
        <button onClick={onConfirm}>{confirmLabel}</button>
      ) : null}
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

const SELECTION: SelectionState = {
  selectAll: false,
  selectedIds: new Set(['pending-1']),
  excludedIds: new Set(),
};

vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({
    columns,
    data,
    isLoading,
    toolbar,
    tableOptions,
    selectionOptions,
  }: {
    columns: Array<{
      id?: string;
      cell?: (props: { row: { original: PendingUser } }) => ReactNode;
    }>;
    data: PendingUser[];
    isLoading?: boolean;
    toolbar?: ReactNode;
    tableOptions?: {
      onPaginationChange?: (updater: unknown) => void;
    };
    selectionOptions?: {
      selectionHeader?: {
        actions?: (props: { selectionState: SelectionState }) => ReactNode;
      };
    };
  }) => {
    const actionColumn = columns.find((column) => column.id === 'actions');

    return (
      <div>
        {isLoading && <div>table-loading</div>}
        {data.map((row) => (
          <div
            key={row.id}
            data-testid={`row-${row.id}`}>
            <span>{row.email}</span>
            {actionColumn?.cell?.({ row: { original: row } })}
          </div>
        ))}
        {toolbar}
        {selectionOptions?.selectionHeader?.actions?.({
          selectionState: SELECTION,
        })}
        <button
          onClick={() =>
            tableOptions?.onPaginationChange?.({
              pageIndex: 0,
              pageSize: 20,
            })
          }>
          Change pagination
        </button>
        <button
          onClick={() =>
            tableOptions?.onPaginationChange?.({
              pageIndex: 1,
              pageSize: 10,
            })
          }>
          Next page
        </button>
      </div>
    );
  },
  DataTableHeadBarOptions: () => <div>headbar-options</div>,
  useRowSelection: () => ({
    clearSelection: mocks.clearSelection,
  }),
}));

const ORGANIZATION_ID = 'org-1';
const PAGE_SIZE = 10;
const SEARCH_TERM = 'john';
const APPROVE_CONFIRM = 'PendingUserListPage.WarningUserAccept.Confirm';
const REJECT_CONFIRM = 'PendingUserListPage.WarningUserRejection.Confirm';
const BULK_APPROVE_CONFIRM = 'PendingUserListPage.WarningUsersAccept.Confirm';
const BULK_REJECT_CONFIRM = 'PendingUserListPage.WarningUsersRejection.Confirm';

const pendingUsers: PendingUser[] = [
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
];

const PENDING_USERS: PendingUsersQuery = {
  pendingUsers: {
    totalCount: pendingUsers.length,
    edges: pendingUsers.map((node) => ({ node })),
  },
};

const FIRST_PAGE_VARIABLES: PendingUsersQueryVariables = {
  first: PAGE_SIZE,
  after: toCursor(PAGE_SIZE, 0),
  orderBy: UserOrdering.Email,
  orderMode: OrderingMode.Asc,
  searchTerm: null,
  filters: [{ key: FilterKey.OrganizationId, value: [ORGANIZATION_ID] }],
};

const LIST_ON_SCREEN_INVALIDATION = {
  queryKey: pendingUsersKeys.list(FIRST_PAGE_VARIABLES),
  exact: true,
};

const lastQueryVariables = () =>
  mocks.pendingUsersQuery.mock.lastCall?.[1] as PendingUsersQueryVariables;

const lastQueryOptions = () =>
  mocks.pendingUsersQuery.mock.lastCall?.[2] as PendingUsersQueryOptions;

const lastSubscriptionOptions = () =>
  mocks.useGraphqlSubscription.mock.lastCall?.[2] as SubscriptionOptions;

const lastMutationCallbacks = (mutation: PendingUserMutation) =>
  mocks.mutationCallbacks[mutation] as MutationCallbacks;

const PENDING_USER_VARIABLES = {
  user_id: 'pending-1',
  organization_id: ORGANIZATION_ID,
};

const renderPendingUserList = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  return {
    invalidateQueries,
    ...testRender(<PendingUserList organization={ORGANIZATION_ID} />, {
      queryClient,
    }),
  };
};

describe('PendingUserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pendingUsersQuery.mockReturnValue({
      data: PENDING_USERS,
      isLoading: false,
    });
  });

  it('should put the add user action in the toolbar', () => {
    // When
    renderPendingUserList();

    // Then
    expect(screen.getByText('AddUser')).toBeInTheDocument();
  });

  it('should load the first page of the pending users of the organization', () => {
    // When
    renderPendingUserList();

    // Then
    expect(lastQueryVariables()).toEqual(FIRST_PAGE_VARIABLES);
  });

  it('should keep the current rows on screen while another page loads', () => {
    // When
    renderPendingUserList();

    // Then
    expect(lastQueryOptions().placeholderData).toBe(keepPreviousData);
  });

  it.each([
    {
      case: 'send the error to the error page when the first load fails',
      data: undefined,
      expected: true,
    },
    {
      case: 'keep the rows on screen when a background refetch fails',
      data: PENDING_USERS,
      expected: false,
    },
  ])('should $case', ({ data, expected }) => {
    // Given
    renderPendingUserList();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data },
    });

    // Then
    expect(shouldThrow).toBe(expected);
  });

  it('should show the table loading state while the pending users load', () => {
    // Given
    mocks.pendingUsersQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    // When
    renderPendingUserList();

    // Then
    expect(screen.getByText('table-loading')).toBeInTheDocument();
  });

  it('should subscribe to the pending user events of the organization', () => {
    // When
    renderPendingUserList();

    // Then
    expect(mocks.useGraphqlSubscription).toHaveBeenCalledWith(
      PendingUserEventsDocument,
      { organizationId: ORGANIZATION_ID },
      expect.anything()
    );
  });

  it('should persist changed page size when pagination changes', async () => {
    // Given
    const { user } = renderPendingUserList();

    // When
    await user.click(screen.getByRole('button', { name: 'Change pagination' }));

    // Then
    expect(mocks.setPageSize).toHaveBeenCalledWith(20);
    expect(lastQueryVariables()).toEqual(
      expect.objectContaining({ first: 20 })
    );
  });

  it('should not search pending users when pressing Escape in the empty search field', async () => {
    // Given
    const { user } = renderPendingUserList();

    // When
    await user.type(
      screen.getByPlaceholderText('UserActions.SearchUser'),
      '{Escape}'
    );

    // Then
    expect(lastQueryVariables()).toEqual(FIRST_PAGE_VARIABLES);
  });

  it('should go back to the first page when the user searches', async () => {
    // Given
    const { user } = renderPendingUserList();
    await user.click(screen.getByRole('button', { name: 'Next page' }));

    // When
    await user.type(
      screen.getByPlaceholderText('UserActions.SearchUser'),
      SEARCH_TERM
    );

    // Then
    expect(lastQueryVariables()).toEqual({
      ...FIRST_PAGE_VARIABLES,
      searchTerm: SEARCH_TERM,
    });
  });

  it('renders pending users and opens confirm dialog when action buttons are clicked', async () => {
    const { user } = renderPendingUserList();

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

  describe('refresh of the list on screen', () => {
    it.each([
      {
        action: 'a single accept',
        icon: 'approve-icon',
        confirm: APPROVE_CONFIRM,
        mutation: 'approve',
        response: { acceptPendingUserInOrganization: { id: 'pending-1' } },
      },
      {
        action: 'a single remove',
        icon: 'reject-icon',
        confirm: REJECT_CONFIRM,
        mutation: 'reject',
        response: { removePendingUserFromOrganization: { id: 'pending-1' } },
      },
    ] as const)(
      'should refresh only the list on screen after $action',
      async ({ icon, confirm, mutation, response }) => {
        // Given
        const { user, invalidateQueries } = renderPendingUserList();
        await user.click(
          within(screen.getByTestId('row-pending-1')).getByLabelText(icon)
        );
        await user.click(screen.getByRole('button', { name: confirm }));

        // When
        act(() =>
          lastMutationCallbacks(mutation).onSuccess(
            response,
            PENDING_USER_VARIABLES
          )
        );

        // Then
        expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(
          LIST_ON_SCREEN_INVALIDATION
        );
      }
    );

    it('should not refresh the list when the accept returns no user', async () => {
      // Given
      const { user, invalidateQueries } = renderPendingUserList();
      await user.click(
        within(screen.getByTestId('row-pending-1')).getByLabelText(
          'approve-icon'
        )
      );
      await user.click(screen.getByRole('button', { name: APPROVE_CONFIRM }));
      const response: PendingUserAcceptMutation = {
        acceptPendingUserInOrganization: null,
      };

      // When
      act(() =>
        lastMutationCallbacks('approve').onSuccess(
          response,
          PENDING_USER_VARIABLES
        )
      );

      // Then
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it.each([
      {
        action: 'a bulk accept',
        confirm: BULK_APPROVE_CONFIRM,
        mutation: 'bulkApprove',
      },
      {
        action: 'a bulk remove',
        confirm: BULK_REJECT_CONFIRM,
        mutation: 'bulkReject',
      },
    ] as const)(
      'should clear the selection and refresh only the list on screen after $action',
      async ({ confirm, mutation }) => {
        // Given
        const { user, invalidateQueries } = renderPendingUserList();
        await user.click(screen.getByRole('button', { name: confirm }));

        // When
        act(() =>
          lastMutationCallbacks(mutation).onSuccess({ success: true }, {})
        );

        // Then
        expect(mocks.clearSelection).toHaveBeenCalledOnce();
        expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(
          LIST_ON_SCREEN_INVALIDATION
        );
      }
    );

    it('should refresh only the list on screen when a pending user is deleted', () => {
      // Given
      const { invalidateQueries } = renderPendingUserList();

      // When
      act(() =>
        lastSubscriptionOptions().onNext({
          UserPending: { delete: { id: 'pending-1' }, invalidate: null },
        })
      );

      // Then
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(
        LIST_ON_SCREEN_INVALIDATION
      );
    });

    it('should refresh the page on screen when a pending user is deleted after a page change', async () => {
      // Given
      const { user, invalidateQueries } = renderPendingUserList();
      await user.click(screen.getByRole('button', { name: 'Next page' }));
      const secondPageVariables = {
        ...FIRST_PAGE_VARIABLES,
        after: toCursor(PAGE_SIZE, 1),
      };
      expect(lastQueryVariables()).toEqual(secondPageVariables);

      // When
      act(() =>
        lastSubscriptionOptions().onNext({
          UserPending: { delete: { id: 'pending-1' }, invalidate: null },
        })
      );

      // Then
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({
        queryKey: pendingUsersKeys.list(secondPageVariables),
        exact: true,
      });
    });

    it('should leave the list as is when the pending users are invalidated', () => {
      // Given
      const { invalidateQueries } = renderPendingUserList();

      // When
      act(() =>
        lastSubscriptionOptions().onNext({
          UserPending: { delete: null, invalidate: { id: ORGANIZATION_ID } },
        })
      );

      // Then
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
