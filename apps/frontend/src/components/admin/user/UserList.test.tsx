import UserList from '@/components/admin/user/UserList';
import { PortalContext } from '@/components/me/AppPortalContext';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import testRender from '@/utils/test/test-render';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { UserOrdering } from '@graphql/generated';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CapturedColumn = {
  id?: string;
  enableSorting?: boolean;
  cell?: (args: { row: { original: Record<string, unknown> } }) => ReactNode;
};

type CapturedOnClickRow = (row: { original: UserList_fragment$data }) => void;

type ResendInviteMutationOptions = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
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

const mocks = vi.hoisted(() => ({
  isAdminPath: true,
  canDeleteUser: true,
  totalCount: 0,
  edges: [] as Array<{ node: Record<string, unknown> }>,
  refetch: vi.fn(),
  setConnectionId: vi.fn(),
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

vi.mock('react-relay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-relay')>();
  return {
    ...actual,
    graphql: (
      strings: TemplateStringsArray,
      ..._values: ReadonlyArray<unknown>
    ) => strings.join(''),
    readInlineData: (_fragment: unknown, node: unknown) => node,
    useSubscription: vi.fn(),
  };
});

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
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
    ...actual,
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

vi.mock('@/hooks/use-users-list', () => ({
  useUsersList: () => ({
    data: {
      users: {
        __id: 'users-connection-id',
        totalCount: mocks.totalCount,
        edges: mocks.edges,
      },
    },
    refetch: mocks.refetch,
  }),
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
    setOrganizationFilter: vi.fn(),
    resetAll: vi.fn(),
    removeOrder: vi.fn(),
  }),
}));

vi.mock('@/components/admin/user/UserListPage', () => ({
  getUserListContext: () => ({ setConnectionId: mocks.setConnectionId }),
}));

vi.mock('@/components/ui/handle-sorting.utils', () => ({
  handleSortingChange: vi.fn(),
  mapToSortingTableValue: () => [],
  transformSortingValueToParams: () => ({}),
}));

vi.mock('@/components/admin/user/UserOrganizationFilter', () => ({
  UserOrganizationFilter: () => <div>UserOrganizationFilter</div>,
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
    }: {
      columns: Array<CapturedColumn>;
      toolbar?: ReactNode;
      onClickRow?: CapturedOnClickRow;
    }) => {
      mocks.capturedColumns = columns;
      mocks.capturedOnClickRow = onClickRow;
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

const renderUserList = () =>
  testRender(
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
      <UserList />
    </PortalContext.Provider>
  );

const makeUserNode = (
  overrides: Partial<UserList_fragment$data> = {}
): UserList_fragment$data => ({
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
  ' $fragmentType': 'UserList_fragment',
  ...overrides,
});

const selectedOrganizationCapabilities: NonNullable<
  UserList_fragment$data['organization_capabilities']
>[number] = {
  id: 'organization-capabilities-1',
  organization: {
    id: SELECTED_ORGANIZATION_ID,
    name: 'Organization',
    personal_space: false,
  },
  capabilities: [SELECTED_ORGANIZATION_CAPABILITY],
};

const renderUserListWith = (node: UserList_fragment$data) => {
  mocks.totalCount = 1;
  mocks.edges = [{ node }];
  return renderUserList();
};

// DataTable is stubbed, so render the user's cell for that column on its own
const renderUserCell = (columnId: string, node: UserList_fragment$data) => {
  renderUserListWith(node);
  const column = mocks.capturedColumns.find(({ id }) => id === columnId);
  if (!column?.cell) {
    throw new Error(`Column "${columnId}" was not captured or has no cell`);
  }
  return render(column.cell({ row: { original: node } }));
};

describe('UserList', () => {
  beforeEach(() => {
    mocks.isAdminPath = true;
    mocks.canDeleteUser = true;
    mocks.totalCount = 0;
    mocks.edges = [];
    mocks.refetch.mockReset();
    mocks.setConnectionId.mockReset();
    mocks.capturedColumns = [];
    mocks.capturedOnClickRow = undefined;
    mocks.resendInvite.mockReset();
    mocks.isResendInvitePending = false;
    mocks.adminResendInvite.mockReset();
    mocks.isAdminResendInvitePending = false;
    mocks.settleResendInvite.mockReset();
    mocks.showSnackbar.mockReset();
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);
  });

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

  it('should not include the invitation status and date columns when TRIAL_INVITE is disabled', () => {
    // Given TRIAL_INVITE is disabled
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);

    // When the list is rendered
    renderUserListWith(makeUserNode());

    // Then no invitation column is shown
    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_status')
    ).toBe(false);
    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_date')
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

    const clickRow = (node: UserList_fragment$data) => {
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
        fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));

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

  describe('when TRIAL_INVITE is enabled', () => {
    beforeEach(() => {
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
    });

    it('should include the invitation status and date columns', () => {
      // Given the bypass admin path
      // When the list is rendered
      renderUserListWith(makeUserNode());

      // Then the invitation columns are shown
      expect(
        mocks.capturedColumns.some(
          (column) => column.id === 'invitation_status'
        )
      ).toBe(true);
      expect(
        mocks.capturedColumns.some((column) => column.id === 'invitation_date')
      ).toBe(true);
      // Resend is folded into the existing actions menu, not a separate column.
      expect(
        mocks.capturedColumns.some(
          (column) => column.id === 'invitation_action'
        )
      ).toBe(false);
    });

    it('should not allow sorting by invitation status, which the API cannot order users by', () => {
      // Given the invitation columns are shown
      // When the list is rendered
      renderUserListWith(makeUserNode());

      // Then the invitation status column cannot be sorted
      expect(
        mocks.capturedColumns.find(
          (column) => column.id === 'invitation_status'
        )?.enableSorting
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
        mocks.capturedColumns.some(
          (column) => column.id === 'invitation_action'
        )
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
          renderUserCell(columnId, makeUserNode({ status: 'expired' }));

          // When resend is clicked
          fireEvent.click(
            screen.getByRole('button', { name: RESEND_INVITE_LABEL })
          );

          // Then the list is refetched, bypassing the Relay store, so the row is up to date
          expect(mocks.refetch).toHaveBeenCalledExactlyOnceWith(
            {},
            { fetchPolicy: 'network-only' }
          );
        });

        it('should not reload the list when the resend fails', () => {
          // Given the server rejects the resend
          mocks.settleResendInvite.mockImplementation(({ onError }) =>
            onError(new Error(SERVER_ERROR_CODE))
          );
          renderUserCell(columnId, makeUserNode({ status: 'expired' }));

          // When resend is clicked
          fireEvent.click(
            screen.getByRole('button', { name: RESEND_INVITE_LABEL })
          );

          // Then the list is left as is
          expect(mocks.refetch).not.toHaveBeenCalled();
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
      fireEvent.click(
        screen.getByRole('button', { name: RESEND_INVITE_LABEL })
      );

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
      fireEvent.click(
        screen.getByRole('button', { name: RESEND_INVITE_LABEL })
      );

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
  });
});
