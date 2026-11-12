import UserList from '@/components/admin/user/UserList';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { PortalContext } from '@/components/me/AppPortalContext';
import { toCursor } from '@/hooks/use-table-pagination';
import testRender from '@/utils/test/test-render';
import {
  AdminUserEventsDocument,
  FilterKey,
  OrganizationUserEventsDocument,
  UserOrdering,
  UsersListQuery,
  UsersListQueryVariables,
} from '@graphql/generated';
import { usersListKeys } from '@graphql/user/users.keys';
import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CapturedColumn = {
  id?: string;
  enableSorting?: boolean;
  cell?: (args: { row: { original: Record<string, unknown> } }) => ReactNode;
};

type CapturedOnClickRow = (row: { original: UsersListUser }) => void;

type ResendInviteMutationOptions = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
};

type UsersListQueryOptions = {
  placeholderData: unknown;
  throwOnError: (
    error: Error,
    query: { state: { data: UsersListQuery | undefined } }
  ) => boolean;
};

type SubscriptionOptions = {
  enabled: boolean;
  onNext: (data: unknown) => void;
};

const USER_EMAIL = 'user-1@test.io';
const USER_FIRST_NAME = 'First';
const USER_LAST_NAME = 'Last';
const SELECTED_ORGANIZATION_ID = 'organization-1';
const SELECTED_ORGANIZATION_CAPABILITY = 'MANAGE_ACCESS';
const INVITATION_DATE = '2024-03-15T12:00:00.000Z';
const FORMATTED_INVITATION_DATE = 'March 15, 2024';
const SERVER_ERROR_CODE = 'ADDING_USER_ERROR';
const RESEND_INVITE_LABEL = 'UserListPage.ResendInvite';
const EDIT_SHEET_TITLE = 'UserActions.UpdateUser';
const PAGE_SIZE = 10;
const SEARCH_TERM = 'jane';
const FILTERED_ORGANIZATION_ID = 'organization-2';

const SECOND_PAGE_CURSOR = toCursor(PAGE_SIZE, 1);
const FIRST_PAGE_VARIABLES: UsersListQueryVariables = {
  first: PAGE_SIZE,
  after: toCursor(PAGE_SIZE, 0),
  orderBy: 'first_name' as UserOrdering,
  orderMode: 'asc' as UsersListQueryVariables['orderMode'],
  searchTerm: null,
  filters: null,
};

const LIST_ON_SCREEN_INVALIDATION = {
  queryKey: usersListKeys.list(FIRST_PAGE_VARIABLES),
  exact: true,
};

const mocks = vi.hoisted(() => ({
  isAdminPath: true,
  canDeleteUser: true,
  totalCount: 0,
  edges: [] as Array<{ node: Record<string, unknown> }>,
  isLoading: false,
  usersListQuery: vi.fn(),
  useGraphqlSubscription: vi.fn(),
  setOrganizationFilter: vi.fn(),
  capturedOrganizationChange: undefined as
    ((organizationId: string | undefined) => void) | undefined,
  capturedOnPaginationChange: undefined as
    ((updater: unknown) => void) | undefined,
  capturedIsLoading: undefined as boolean | undefined,
  capturedOnUserDeleted: undefined as (() => void) | undefined,
  capturedColumns: [] as Array<CapturedColumn>,
  capturedOnClickRow: undefined as CapturedOnClickRow | undefined,
  resendInvite: vi.fn(),
  isResendInvitePending: false,
  adminResendInvite: vi.fn(),
  isAdminResendInvitePending: false,
  // Lets each test decide how the server answers a resend (no answer by default)
  settleResendInvite: vi.fn<(options: ResendInviteMutationOptions) => void>(),
  showSnackbar: vi.fn(),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  const withMockedQuery = await mockGeneratedQueryHooks(importOriginal, {
    useUsersListQuery: mocks.usersListQuery,
  });
  const mockResendInviteMutation =
    (mutate: (variables: unknown) => void, isPending: () => boolean) =>
    (_client: unknown, options: ResendInviteMutationOptions) => ({
      mutate: (variables: unknown) => {
        mutate(variables);
        mocks.settleResendInvite(options);
      },
      isPending: isPending(),
    });
  return {
    ...withMockedQuery,
    useUserResendInviteMutation: mockResendInviteMutation(
      mocks.resendInvite,
      () => mocks.isResendInvitePending
    ),
    useUserAdminResendInviteMutation: mockResendInviteMutation(
      mocks.adminResendInvite,
      () => mocks.isAdminResendInvitePending
    ),
  };
});

vi.mock('@/hooks/use-admin-path', () => ({
  default: () => mocks.isAdminPath,
}));

vi.mock('@/hooks/use-portal-capability', () => ({
  useAdminByPass: () => mocks.canDeleteUser,
}));

vi.mock('@/hooks/use-graphql-subscription', () => ({
  useGraphqlSubscription: mocks.useGraphqlSubscription,
}));

// The debounce delay is not under test: searches run as soon as they are asked
vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (callback: (...args: never[]) => void) =>
    Object.assign(callback, { cancel: vi.fn() }),
}));

vi.mock('@/components/admin/user/user-list-localstorage', () => ({
  useUserListLocalstorage: () => ({
    pageSize: 10,
    setPageSize: vi.fn(),
    orderMode: 'asc',
    setOrderMode: vi.fn(),
    orderBy: 'first_name',
    setOrderBy: vi.fn(),
    columnOrder: [],
    setColumnOrder: vi.fn(),
    columnVisibility: {},
    setColumnVisibility: vi.fn(),
    organizationFilter: undefined,
    setOrganizationFilter: mocks.setOrganizationFilter,
    resetAll: vi.fn(),
    removeOrder: vi.fn(),
  }),
}));

vi.mock('@/components/ui/handle-sorting.utils', () => ({
  handleSortingChange: vi.fn(),
  mapToSortingTableValue: () => [],
  transformSortingValueToParams: () => ({}),
}));

vi.mock('@/components/admin/user/forms/AddUser', () => ({
  AddUser: () => <div>AddUser</div>,
}));

vi.mock('@/components/admin/user/forms/admin/AdminAddUser', () => ({
  AdminAddUser: () => <div>AdminAddUser</div>,
}));

vi.mock('@/components/admin/user/UserOrganizationFilter', () => ({
  UserOrganizationFilter: ({
    onChange,
  }: {
    onChange: (organizationId: string | undefined) => void;
  }) => {
    mocks.capturedOrganizationChange = onChange;
    return <div>UserOrganizationFilter</div>;
  },
}));

vi.mock('@/components/admin/user/DeleteUser', () => ({
  DeleteUser: ({ onUserDeleted }: { onUserDeleted: () => void }) => {
    mocks.capturedOnUserDeleted = onUserDeleted;
    return null;
  },
}));

// Simplified stand-ins so the resend/delete menu items render as plain,
// always-mounted buttons instead of a real (portal-based) Radix dropdown.
vi.mock('@/components/ui/IconActions', () => ({
  IconActions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IconActionsItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/data-table', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/ui/data-table')>();
  return {
    ...actual,
    DataTableHeadBarOptions: () => <div>DataTableHeadBarOptions</div>,
    DataTable: ({
      columns,
      toolbar,
      onClickRow,
      isLoading,
      tableOptions,
    }: {
      columns: Array<CapturedColumn>;
      toolbar?: ReactNode;
      onClickRow?: CapturedOnClickRow;
      isLoading?: boolean;
      tableOptions?: { onPaginationChange?: (updater: unknown) => void };
    }) => {
      mocks.capturedColumns = columns;
      mocks.capturedOnClickRow = onClickRow;
      mocks.capturedIsLoading = isLoading;
      mocks.capturedOnPaginationChange = tableOptions?.onPaginationChange;
      return (
        <div>
          <div>DataTable</div>
          {toolbar}
        </div>
      );
    },
  };
});

vi.mock('@/components/admin/user/forms/admin/AdminUserUpdateForm', () => ({
  AdminUserUpdateForm: () => <div>AdminUserUpdateForm</div>,
}));

const renderUserList = (organization?: string) => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  return {
    invalidateQueries,
    ...testRender(
      <PortalContext.Provider
        value={{
          me: {
            id: 'me-user-id',
            selected_organization_id: SELECTED_ORGANIZATION_ID,
            organizations: [],
            selected_org_capabilities: [],
            capabilities: [],
          } as never,
        }}>
        <UserList organization={organization} />
      </PortalContext.Provider>,
      { queryClient }
    ),
  };
};

const lastQueryVariables = () =>
  mocks.usersListQuery.mock.lastCall?.[1] as UsersListQueryVariables;

const lastQueryOptions = () =>
  mocks.usersListQuery.mock.lastCall?.[2] as UsersListQueryOptions;

const lastSubscriptionOptions = (document: string) =>
  mocks.useGraphqlSubscription.mock.calls
    .filter(([calledDocument]) => calledDocument === document)
    .at(-1)?.[2] as SubscriptionOptions;

const makeUserNode = (
  overrides: Partial<UsersListUser> = {}
): UsersListUser => ({
  id: 'user-1',
  email: USER_EMAIL,
  first_name: USER_FIRST_NAME,
  last_name: USER_LAST_NAME,
  disabled: false,
  last_login: null,
  country: null,
  status: null,
  invitation_date: null,
  organization_capabilities: [],
  ...overrides,
});

const selectedOrganizationCapabilities: NonNullable<
  UsersListUser['organization_capabilities']
>[number] = {
  id: 'organization-capabilities-1',
  organization: {
    id: SELECTED_ORGANIZATION_ID,
    name: 'Organization',
    personal_space: false,
  },
  capabilities: [SELECTED_ORGANIZATION_CAPABILITY],
};

const renderUserListWith = (node: UsersListUser) => {
  mocks.totalCount = 1;
  mocks.edges = [{ node }];
  return renderUserList();
};

// DataTable is stubbed, so render the user's cell for that column on its own
const renderUserCell = (columnId: string, node: UsersListUser) => {
  const { invalidateQueries } = renderUserListWith(node);
  const column = mocks.capturedColumns.find(({ id }) => id === columnId);
  if (!column?.cell) {
    throw new Error(`Column "${columnId}" was not captured or has no cell`);
  }
  return {
    invalidateQueries,
    ...render(column.cell({ row: { original: node } })),
  };
};

describe('UserList', () => {
  beforeEach(() => {
    mocks.isAdminPath = true;
    mocks.canDeleteUser = true;
    mocks.totalCount = 0;
    mocks.edges = [];
    mocks.isLoading = false;
    vi.clearAllMocks();
    mocks.usersListQuery.mockImplementation(() => ({
      data: { users: { totalCount: mocks.totalCount, edges: mocks.edges } },
      isLoading: mocks.isLoading,
    }));
    mocks.capturedOrganizationChange = undefined;
    mocks.capturedOnPaginationChange = undefined;
    mocks.capturedIsLoading = undefined;
    mocks.capturedOnUserDeleted = undefined;
    mocks.capturedColumns = [];
    mocks.capturedOnClickRow = undefined;
    mocks.resendInvite.mockReset();
    mocks.isResendInvitePending = false;
    mocks.adminResendInvite.mockReset();
    mocks.isAdminResendInvitePending = false;
    mocks.settleResendInvite.mockReset();
    mocks.showSnackbar.mockReset();
  });

  it.each([
    {
      path: 'the bypass admin path',
      isAdminPath: true,
      action: 'AdminAddUser',
    },
    {
      path: 'the org-admin manage/user path',
      isAdminPath: false,
      action: 'AddUser',
    },
  ])(
    'should put the add user action of $path in the toolbar',
    ({ isAdminPath, action }) => {
      // Given
      mocks.isAdminPath = isAdminPath;

      // When
      renderUserList();

      // Then
      expect(screen.getByText(action)).toBeInTheDocument();
    }
  );

  it('should render the empty state when there are no users', () => {
    renderUserList();

    expect(screen.getByText('UserListPage.NoUsers')).toBeInTheDocument();
  });

  it('should include the actions column for admin users with delete capability', () => {
    mocks.totalCount = 1;
    mocks.edges = [
      {
        node: {
          id: 'user-1',
          email: 'user-1@test.io',
          first_name: 'First',
          last_name: 'Last',
          disabled: false,
          last_login: null,
          country: null,
          organization_capabilities: [],
        },
      },
    ];

    renderUserList();

    expect(
      mocks.capturedColumns.some((column) => column.id === 'actions')
    ).toBe(true);
  });

  it('should not include the actions column when delete capability is missing', () => {
    mocks.totalCount = 1;
    mocks.canDeleteUser = false;
    mocks.edges = [
      {
        node: {
          id: 'user-1',
          email: 'user-1@test.io',
          first_name: 'First',
          last_name: 'Last',
          disabled: false,
          last_login: null,
          country: null,
          organization_capabilities: [],
        },
      },
    ];

    renderUserList();

    expect(
      mocks.capturedColumns.some((column) => column.id === 'actions')
    ).toBe(false);
  });

  it('should include capability column outside the admin path', () => {
    mocks.totalCount = 1;
    mocks.isAdminPath = false;
    mocks.edges = [
      {
        node: {
          id: 'user-1',
          email: 'user-1@test.io',
          first_name: 'First',
          last_name: 'Last',
          disabled: false,
          last_login: null,
          country: null,
          organization_capabilities: [
            {
              id: 'org-cap-1',
              organization: {
                id: 'organization-1',
                name: 'Organization',
                personal_space: false,
              },
              capabilities: ['ADMINISTRATE_ORGANIZATION'],
            },
          ],
        },
      },
    ];

    renderUserList();

    expect(
      mocks.capturedColumns.some((column) => column.id === 'capability')
    ).toBe(true);
    expect(
      mocks.capturedColumns.some((column) => column.id === 'actions')
    ).toBe(false);
  });

  describe('edit sheet', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const firstUser = makeUserNode();
    const secondUser = makeUserNode({
      id: 'user-2',
      email: 'user-2@test.io',
    });

    const clickRow = (node: UsersListUser) => {
      const onClickRow = mocks.capturedOnClickRow;
      if (!onClickRow) {
        throw new Error('DataTable was not given an onClickRow handler');
      }
      act(() => onClickRow({ original: node }));
    };

    it.each([
      ['the same user', firstUser],
      ['another user', secondUser],
    ])(
      'should open the edit sheet when %s is clicked right after the sheet closed',
      (_row, nextUser) => {
        // Given the edit sheet of a user, just closed
        mocks.totalCount = 2;
        mocks.edges = [{ node: firstUser }, { node: secondUser }];
        renderUserList();
        clickRow(firstUser);
        const sheet = screen.getByRole('dialog', { name: EDIT_SHEET_TITLE });
        fireEvent.click(
          within(sheet).getByRole('button', { name: 'Utils.Close' })
        );

        // When a row is clicked at once, and every pending timer runs
        clickRow(nextUser);
        act(() => vi.runAllTimers());

        // Then the edit sheet is open
        expect(
          screen.getByRole('dialog', { name: EDIT_SHEET_TITLE })
        ).toBeInTheDocument();
      }
    );
  });

  it('should include the invitation status and date columns', () => {
    // Given the bypass admin path
    // When the list is rendered
    renderUserListWith(makeUserNode());

    // Then the invitation columns are shown
    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_status')
    ).toBe(true);
    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_date')
    ).toBe(true);
    // Resend is folded into the existing actions menu, not a separate column.
    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_action')
    ).toBe(false);
  });

  it('should not allow sorting by invitation status, which the API cannot order users by', () => {
    // Given the invitation columns are shown
    // When the list is rendered
    renderUserListWith(makeUserNode());

    // Then the invitation status column cannot be sorted
    expect(
      mocks.capturedColumns.find((column) => column.id === 'invitation_status')
        ?.enableSorting
    ).toBe(false);
  });

  it('should allow sorting by invitation date with an ordering the API accepts', () => {
    // Given the invitation columns are shown
    // When the list is rendered
    renderUserListWith(makeUserNode());

    // Then the invitation date column is sortable, and its id (sent as orderBy) is a valid ordering
    const column = mocks.capturedColumns.find(
      ({ id }) => id === 'invitation_date'
    );
    expect(column?.enableSorting).not.toBe(false);
    expect(Object.values(UserOrdering)).toContain(column?.id);
  });

  it('should include a standalone resend action column on the org-admin manage/user path', () => {
    // Given the org-admin path: `/manage/user` never has `useAdminPath() === true`,
    // unlike the bypass `/admin/user` route, so resend needs its own column there
    mocks.isAdminPath = false;

    // When the list is rendered
    renderUserListWith(makeUserNode());

    // Then the resend column is shown, and not the bypass-only actions menu
    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_action')
    ).toBe(true);
    expect(
      mocks.capturedColumns.some((column) => column.id === 'actions')
    ).toBe(false);
  });

  describe('invitation status cell', () => {
    it.each([
      ['waiting', 'UserListPage.InvitationPending'],
      ['invited', 'UserListPage.InvitationPending'],
      ['expired', 'UserListPage.InvitationExpired'],
    ] as const)(
      'should render status "%s" as "%s"',
      (status, expectedLabel) => {
        // Given a user with the given invitation status
        const node = makeUserNode({ status });

        // When the invitation_status cell is rendered
        renderUserCell('invitation_status', node);

        // Then it shows the matching badge label
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      }
    );

    it.each([[null], [undefined]])(
      'should render nothing when the invitation status is %s (never invited, or already accepted)',
      (status) => {
        // Given a user with no invitation status
        const node = makeUserNode({ status });

        // When the invitation_status cell is rendered
        const { container } = renderUserCell('invitation_status', node);

        // Then no badge is shown
        expect(container).toBeEmptyDOMElement();
      }
    );
  });

  describe('invitation date cell', () => {
    it('should render a dash when the user has no invitation date', () => {
      // Given a user without an invitation date
      const node = makeUserNode({ invitation_date: null });

      // When the invitation_date cell is rendered
      renderUserCell('invitation_date', node);

      // Then it falls back to a dash
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should render the full invitation date when the user has one', () => {
      // Given a user with an invitation date
      const node = makeUserNode({ invitation_date: INVITATION_DATE });

      // When the invitation_date cell is rendered
      renderUserCell('invitation_date', node);

      // Then it shows the date in the full format
      expect(screen.getByText(FORMATTED_INVITATION_DATE)).toBeInTheDocument();
    });
  });

  describe.each([
    {
      entryPoint: 'org-admin resend button',
      isAdminPath: false,
      columnId: 'invitation_action',
      pendingFlag: 'isResendInvitePending',
    },
    {
      entryPoint: 'bypass admin actions menu',
      isAdminPath: true,
      columnId: 'actions',
      pendingFlag: 'isAdminResendInvitePending',
    },
  ] as const)(
    'resend from the $entryPoint',
    ({ isAdminPath, columnId, pendingFlag }) => {
      beforeEach(() => {
        mocks.isAdminPath = isAdminPath;
      });

      it('should show the resend action when the invitation has expired', () => {
        // Given a user whose invitation has expired
        const node = makeUserNode({ status: 'expired' });

        // When the user's cell is rendered
        renderUserCell(columnId, node);

        // Then the resend action is available
        expect(
          screen.getByRole('button', { name: RESEND_INVITE_LABEL })
        ).toBeEnabled();
      });

      it.each([['waiting'], ['invited'], [null], [undefined]])(
        'should not show the resend action when status is %s',
        (status) => {
          // Given an invitation still pending, or no invitation at all
          const node = makeUserNode({ status });

          // When the user's cell is rendered
          renderUserCell(columnId, node);

          // Then no resend action is offered
          expect(
            screen.queryByRole('button', { name: RESEND_INVITE_LABEL })
          ).not.toBeInTheDocument();
        }
      );

      it('should disable the resend action while a resend is in flight', () => {
        // Given a resend already in flight
        mocks[pendingFlag] = true;
        const node = makeUserNode({ status: 'expired' });

        // When the user's cell is rendered
        renderUserCell(columnId, node);

        // Then resend is disabled so a double click cannot send it twice
        expect(
          screen.getByRole('button', { name: RESEND_INVITE_LABEL })
        ).toBeDisabled();
      });

      it('should notify success when the resend succeeds', () => {
        // Given the server accepts the resend
        mocks.settleResendInvite.mockImplementation(({ onSuccess }) =>
          onSuccess()
        );
        renderUserCell(columnId, makeUserNode({ status: 'expired' }));

        // When resend is clicked
        fireEvent.click(
          screen.getByRole('button', { name: RESEND_INVITE_LABEL })
        );

        // Then success is shown
        expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith({
          severity: 'success',
          title: 'Utils.Success',
          description: 'UserListPage.ResendInviteSuccess',
        });
      });

      it('should show the server error when the resend fails', () => {
        // Given the server rejects the resend with an error code
        mocks.settleResendInvite.mockImplementation(({ onError }) =>
          onError(new Error(SERVER_ERROR_CODE))
        );
        renderUserCell(columnId, makeUserNode({ status: 'expired' }));

        // When resend is clicked
        fireEvent.click(
          screen.getByRole('button', { name: RESEND_INVITE_LABEL })
        );

        // Then the matching error is shown
        expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith({
          severity: 'error',
          title: 'Utils.Error',
          description: `Error.Server.${SERVER_ERROR_CODE}`,
        });
      });

      it('should reload the list from the server when the resend succeeds', () => {
        // Given the server accepts the resend
        mocks.settleResendInvite.mockImplementation(({ onSuccess }) =>
          onSuccess()
        );
        const { invalidateQueries } = renderUserCell(
          columnId,
          makeUserNode({ status: 'expired' })
        );

        // When resend is clicked
        fireEvent.click(
          screen.getByRole('button', { name: RESEND_INVITE_LABEL })
        );

        // Then the list on screen is reloaded, so the row is up to date
        expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(
          LIST_ON_SCREEN_INVALIDATION
        );
      });

      it('should not reload the list when the resend fails', () => {
        // Given the server rejects the resend
        mocks.settleResendInvite.mockImplementation(({ onError }) =>
          onError(new Error(SERVER_ERROR_CODE))
        );
        const { invalidateQueries } = renderUserCell(
          columnId,
          makeUserNode({ status: 'expired' })
        );

        // When resend is clicked
        fireEvent.click(
          screen.getByRole('button', { name: RESEND_INVITE_LABEL })
        );

        // Then the list is left as is
        expect(invalidateQueries).not.toHaveBeenCalled();
      });
    }
  );

  it('should resend through addUser with the selected organization capabilities on the org-admin path', () => {
    // Given an org admin and an expired invitation in their organization
    mocks.isAdminPath = false;
    const node = makeUserNode({
      status: 'expired',
      organization_capabilities: [selectedOrganizationCapabilities],
    });
    renderUserCell('invitation_action', node);

    // When resend is clicked
    fireEvent.click(screen.getByRole('button', { name: RESEND_INVITE_LABEL }));

    // Then addUser gets the email and the capabilities in the selected organization
    expect(mocks.resendInvite).toHaveBeenCalledExactlyOnceWith({
      input: {
        email: USER_EMAIL,
        password: null,
        capabilities: [SELECTED_ORGANIZATION_CAPABILITY],
      },
    });
    expect(mocks.adminResendInvite).not.toHaveBeenCalled();
  });

  it('should resend through adminAddUser with the user identity and organization capabilities on the bypass admin path', () => {
    // Given the bypass admin path and an expired invitation
    const node = makeUserNode({
      status: 'expired',
      organization_capabilities: [selectedOrganizationCapabilities],
    });
    renderUserCell('actions', node);

    // When resend is clicked
    fireEvent.click(screen.getByRole('button', { name: RESEND_INVITE_LABEL }));

    // Then adminAddUser gets the user identity and their organization capabilities
    expect(mocks.adminResendInvite).toHaveBeenCalledExactlyOnceWith({
      input: {
        email: USER_EMAIL,
        password: null,
        first_name: USER_FIRST_NAME,
        last_name: USER_LAST_NAME,
        organization_capabilities: [
          {
            organization_id: SELECTED_ORGANIZATION_ID,
            capabilities: [SELECTED_ORGANIZATION_CAPABILITY],
          },
        ],
      },
    });
    expect(mocks.resendInvite).not.toHaveBeenCalled();
  });

  it('should keep the delete action next to resend in the bypass admin actions menu', () => {
    // Given the bypass admin path and an expired invitation
    const node = makeUserNode({ status: 'expired' });

    // When the actions cell is rendered
    renderUserCell('actions', node);

    // Then delete is still offered
    expect(
      screen.getByRole('button', { name: 'Utils.Delete' })
    ).toBeInTheDocument();
  });

  describe('users list query', () => {
    it.each([
      {
        path: 'the bypass admin path, without an organization filter',
        isAdminPath: true,
        organization: undefined,
        filters: null,
      },
      {
        path: 'the org-admin manage/user path, in its organization',
        isAdminPath: false,
        organization: SELECTED_ORGANIZATION_ID,
        filters: [
          { key: FilterKey.OrganizationId, value: [SELECTED_ORGANIZATION_ID] },
        ],
      },
    ])(
      'should load the first page of users on $path',
      ({ isAdminPath, organization, filters }) => {
        // Given
        mocks.isAdminPath = isAdminPath;

        // When
        renderUserList(organization);

        // Then
        expect(lastQueryVariables()).toEqual({
          ...FIRST_PAGE_VARIABLES,
          filters,
        });
      }
    );

    it('should go back to the first page when the user searches', async () => {
      // Given
      const { user } = renderUserList();
      act(() =>
        mocks.capturedOnPaginationChange!({
          pageIndex: 1,
          pageSize: PAGE_SIZE,
        })
      );
      expect(lastQueryVariables().after).toBe(SECOND_PAGE_CURSOR);

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

    it('should store the organization filter and go back to the first page when it changes', () => {
      // Given
      renderUserList();
      act(() =>
        mocks.capturedOnPaginationChange!({
          pageIndex: 1,
          pageSize: PAGE_SIZE,
        })
      );
      expect(lastQueryVariables().after).toBe(SECOND_PAGE_CURSOR);

      // When
      act(() => mocks.capturedOrganizationChange?.(FILTERED_ORGANIZATION_ID));

      // Then
      expect(mocks.setOrganizationFilter).toHaveBeenCalledWith(
        FILTERED_ORGANIZATION_ID
      );
      expect(lastQueryVariables()).toEqual({
        ...FIRST_PAGE_VARIABLES,
        filters: [
          { key: FilterKey.OrganizationId, value: [FILTERED_ORGANIZATION_ID] },
        ],
      });
    });

    it('should keep the current rows on screen while another page loads', () => {
      // When
      renderUserList();

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
        data: { users: { totalCount: 0, edges: [] } },
        expected: false,
      },
    ])('should $case', ({ data, expected }) => {
      // Given
      renderUserList();

      // When
      const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
        state: { data },
      });

      // Then
      expect(shouldThrow).toBe(expected);
    });

    it('should show the table loading state, and no empty state, while the users load', () => {
      // Given
      mocks.usersListQuery.mockImplementation(() => ({
        data: undefined,
        isLoading: true,
      }));

      // When
      renderUserList();

      // Then
      expect(mocks.capturedIsLoading).toBe(true);
      expect(
        screen.queryByText('UserListPage.NoUsers')
      ).not.toBeInTheDocument();
    });

    it('should reload the list on screen when a user is deleted', () => {
      // Given
      const { invalidateQueries } = renderUserCell('actions', makeUserNode());
      fireEvent.click(screen.getByRole('button', { name: 'Utils.Delete' }));

      // When
      act(() => mocks.capturedOnUserDeleted?.());

      // Then
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(
        LIST_ON_SCREEN_INVALIDATION
      );
    });
  });

  describe('new users in real time', () => {
    it.each([
      {
        path: 'the bypass admin path',
        isAdminPath: true,
        organization: undefined,
        adminEnabled: true,
        organizationEnabled: false,
      },
      {
        path: 'the org-admin manage/user path',
        isAdminPath: false,
        organization: SELECTED_ORGANIZATION_ID,
        adminEnabled: false,
        organizationEnabled: true,
      },
      {
        path: 'the org-admin manage/user path without an organization',
        isAdminPath: false,
        organization: undefined,
        adminEnabled: false,
        organizationEnabled: false,
      },
    ])(
      'should listen to the right new users on $path',
      ({ isAdminPath, organization, adminEnabled, organizationEnabled }) => {
        // Given
        mocks.isAdminPath = isAdminPath;

        // When
        renderUserList(organization);

        // Then
        expect(lastSubscriptionOptions(AdminUserEventsDocument).enabled).toBe(
          adminEnabled
        );
        expect(
          lastSubscriptionOptions(OrganizationUserEventsDocument).enabled
        ).toBe(organizationEnabled);
      }
    );

    it('should listen to the new users of the organization', () => {
      // Given
      mocks.isAdminPath = false;

      // When
      renderUserList(SELECTED_ORGANIZATION_ID);

      // Then
      expect(mocks.useGraphqlSubscription).toHaveBeenCalledWith(
        OrganizationUserEventsDocument,
        { organizationId: SELECTED_ORGANIZATION_ID },
        expect.anything()
      );
    });

    it.each([
      {
        path: 'the bypass admin path',
        isAdminPath: true,
        organization: undefined,
        document: AdminUserEventsDocument,
        event: { AdminUser: { add: { id: 'new-user' } } },
        filters: null,
      },
      {
        path: 'the org-admin manage/user path',
        isAdminPath: false,
        organization: SELECTED_ORGANIZATION_ID,
        document: OrganizationUserEventsDocument,
        event: { User: { add: { id: 'new-user' } } },
        filters: [
          { key: FilterKey.OrganizationId, value: [SELECTED_ORGANIZATION_ID] },
        ],
      },
    ])(
      'should reload the list on screen when a user is added on $path',
      ({ isAdminPath, organization, document, event, filters }) => {
        // Given
        mocks.isAdminPath = isAdminPath;
        const { invalidateQueries } = renderUserList(organization);

        // When
        act(() => lastSubscriptionOptions(document).onNext(event));

        // Then
        expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({
          queryKey: usersListKeys.list({ ...FIRST_PAGE_VARIABLES, filters }),
          exact: true,
        });
      }
    );

    it('should reload the searched list when a user is added after a search', async () => {
      // Given
      const { user, invalidateQueries } = renderUserList();
      await user.type(
        screen.getByPlaceholderText('UserActions.SearchUser'),
        SEARCH_TERM
      );
      const searchedVariables = {
        ...FIRST_PAGE_VARIABLES,
        searchTerm: SEARCH_TERM,
      };
      expect(lastQueryVariables()).toEqual(searchedVariables);

      // When
      act(() =>
        lastSubscriptionOptions(AdminUserEventsDocument).onNext({
          AdminUser: { add: { id: 'new-user' } },
        })
      );

      // Then
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({
        queryKey: usersListKeys.list(searchedVariables),
        exact: true,
      });
    });
  });
});
