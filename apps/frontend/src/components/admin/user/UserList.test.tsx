import UserList from '@/components/admin/user/UserList';
import { PortalContext } from '@/components/me/AppPortalContext';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import testRender from '@/utils/test/test-render';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type CapturedColumn = {
  id?: string;
  cell?: (args: { row: { original: Record<string, unknown> } }) => ReactNode;
};

const mocks = vi.hoisted(() => ({
  isAdminPath: true,
  canDeleteUser: true,
  totalCount: 0,
  edges: [] as Array<{ node: Record<string, unknown> }>,
  refetch: vi.fn(),
  setConnectionId: vi.fn(),
  capturedColumns: [] as Array<CapturedColumn>,
  commitMutation: vi.fn(),
  toast: vi.fn(),
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
    useMutation: () => [mocks.commitMutation, false],
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

vi.mock('@filigran/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@filigran/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: mocks.toast }),
    DataTableHeadBarOptions: () => <div>DataTableHeadBarOptions</div>,
    DataTable: ({
      columns,
      toolbar,
    }: {
      columns: Array<CapturedColumn>;
      toolbar?: ReactNode;
    }) => {
      mocks.capturedColumns = columns;
      return (
        <div>
          <div>DataTable</div>
          {toolbar}
        </div>
      );
    },
  };
});

const renderUserList = () =>
  testRender(
    <PortalContext.Provider
      value={{
        me: {
          id: 'me-user-id',
          selected_organization_id: 'organization-1',
          organizations: [],
          selected_org_capabilities: [],
          capabilities: [],
        } as never,
      }}>
      <UserList />
    </PortalContext.Provider>
  );

// Fills in the fields every test fixture needs so each test only has to
// specify the fields it actually cares about (status/invitation_date).
const makeUserNode = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'user-1',
  email: 'user-1@test.io',
  first_name: 'First',
  last_name: 'Last',
  disabled: false,
  last_login: null,
  country: null,
  status: null,
  invitation_date: null,
  organization_capabilities: [],
  ...overrides,
});

// Renders a single captured column's cell in isolation, so we can assert on
// the actual rendered output (badge label, button/menu-item presence) instead
// of just the column's id/existence.
const renderCell = (columnId: string, original: Record<string, unknown>) => {
  const column = mocks.capturedColumns.find((c) => c.id === columnId);
  if (!column?.cell) {
    throw new Error(`Column "${columnId}" was not captured or has no cell`);
  }
  return render(column.cell({ row: { original } }));
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
    mocks.commitMutation.mockReset();
    mocks.toast.mockReset();
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

  it('should include the invitation status and date columns when TRIAL_INVITE is enabled', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
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
          status: 'expired',
          invitation_date: null,
          organization_capabilities: [],
        },
      },
    ];

    renderUserList();

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

  it('should not include the invitation status and date columns when TRIAL_INVITE is disabled', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);
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
          status: 'expired',
          invitation_date: null,
          organization_capabilities: [],
        },
      },
    ];

    renderUserList();

    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_status')
    ).toBe(false);
    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_date')
    ).toBe(false);
  });

  it('should include a standalone resend action column on the org-admin manage/user path', () => {
    // `/manage/user` (org admin) never has `useAdminPath() === true`, unlike
    // the bypass `/admin/user` route, so resend needs its own column there.
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
    mocks.isAdminPath = false;
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
          status: 'expired',
          invitation_date: null,
          organization_capabilities: [],
        },
      },
    ];

    renderUserList();

    expect(
      mocks.capturedColumns.some((column) => column.id === 'invitation_action')
    ).toBe(true);
    // Delete is a bypass-only, admin-path-only capability.
    expect(
      mocks.capturedColumns.some((column) => column.id === 'actions')
    ).toBe(false);
  });

  describe('invitation status cell', () => {
    it.each([
      ['waiting', 'UserListPage.InvitationPending'],
      ['invited', 'UserListPage.InvitationPending'],
      ['expired', 'UserListPage.InvitationExpired'],
      [null, 'UserListPage.InvitationAccepted'],
    ])('should render status "%s" as "%s"', (status, expectedLabel) => {
      // Given a user with the given invitation status
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
      mocks.totalCount = 1;
      const node = makeUserNode({ status });
      mocks.edges = [{ node }];
      renderUserList();

      // When the invitation_status cell is rendered
      renderCell('invitation_status', node);

      // Then it shows the matching badge label, and only that one
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('invitation date cell', () => {
    it('should render a dash when the user has no invitation date', () => {
      // Given a user without an invitation date
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
      mocks.totalCount = 1;
      const node = makeUserNode({ invitation_date: null });
      mocks.edges = [{ node }];
      renderUserList();

      // When the invitation_date cell is rendered
      renderCell('invitation_date', node);

      // Then it falls back to a dash
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should render a formatted (non-dash) date when the user has an invitation date', () => {
      // Given a user with an invitation date
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
      mocks.totalCount = 1;
      const node = makeUserNode({
        invitation_date: '2024-03-15T00:00:00.000Z',
      });
      mocks.edges = [{ node }];
      renderUserList();

      // When the invitation_date cell is rendered
      const { container } = renderCell('invitation_date', node);

      // Then it renders without throwing and shows a real (non-dash) value
      expect(container).toHaveTextContent(/./);
      expect(screen.queryByText('-')).not.toBeInTheDocument();
    });
  });

  describe('standalone resend button (org-admin manage/user path)', () => {
    it.each([
      ['waiting', true],
      ['invited', true],
      ['expired', true],
      [null, false],
    ])(
      'should show the resend button: %s when status is "%s"',
      (status, shouldShow) => {
        // Given the org-admin path with a user at the given invitation status
        vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
        mocks.isAdminPath = false;
        mocks.totalCount = 1;
        const node = makeUserNode({ status });
        mocks.edges = [{ node }];
        renderUserList();

        // When the invitation_action cell is rendered
        renderCell('invitation_action', node);

        // Then the resend button is shown only for a pending invitation
        if (shouldShow) {
          expect(
            screen.getByText('UserListPage.ResendInvite')
          ).toBeInTheDocument();
        } else {
          expect(
            screen.queryByText('UserListPage.ResendInvite')
          ).not.toBeInTheDocument();
        }
      }
    );

    it('should call the org-admin resend mutation with the email and the capabilities for the current organization on click', () => {
      // Given a pending invitation with capabilities on the admin's selected
      // org and on another org (which must be excluded from the call)
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
      mocks.isAdminPath = false;
      mocks.totalCount = 1;
      const node = makeUserNode({
        status: 'invited',
        organization_capabilities: [
          {
            id: 'org-cap-1',
            organization: {
              id: 'organization-1',
              name: 'Org 1',
              personal_space: false,
            },
            capabilities: ['SETTINGS_ORGANIZATION'],
          },
          {
            id: 'org-cap-2',
            organization: {
              id: 'organization-2',
              name: 'Org 2',
              personal_space: false,
            },
            capabilities: ['BYPASS'],
          },
        ],
      });
      mocks.edges = [{ node }];
      renderUserList();
      renderCell('invitation_action', node);

      // When the resend button is clicked
      fireEvent.click(screen.getByText('UserListPage.ResendInvite'));

      // Then the addUser mutation is called with the user's email and only
      // the capabilities for the admin's own selected organization
      expect(mocks.commitMutation).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          variables: {
            input: {
              email: 'user-1@test.io',
              capabilities: ['SETTINGS_ORGANIZATION'],
            },
          },
        })
      );
    });
  });

  describe('resend menu item (bypass admin actions menu)', () => {
    it.each([
      ['waiting', true],
      ['invited', true],
      ['expired', true],
      [null, false],
    ])(
      'should show the resend menu item: %s when status is "%s"',
      (status, shouldShow) => {
        // Given the bypass admin path with a user at the given invitation status
        vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
        mocks.isAdminPath = true;
        mocks.canDeleteUser = true;
        mocks.totalCount = 1;
        const node = makeUserNode({ status });
        mocks.edges = [{ node }];
        renderUserList();

        // When the actions cell is rendered
        renderCell('actions', node);

        // Then the resend menu item is shown only for a pending invitation,
        // and Delete is always available regardless of invitation status
        if (shouldShow) {
          expect(
            screen.getByText('UserListPage.ResendInvite')
          ).toBeInTheDocument();
        } else {
          expect(
            screen.queryByText('UserListPage.ResendInvite')
          ).not.toBeInTheDocument();
        }
        expect(screen.getByText('Utils.Delete')).toBeInTheDocument();
      }
    );

    it('should call the admin resend mutation with the email, name, and full per-organization capabilities on click', () => {
      // Given a pending invitation with capabilities on two non-personal
      // orgs and a personal-space org (which must be excluded from the call)
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
      mocks.isAdminPath = true;
      mocks.canDeleteUser = true;
      mocks.totalCount = 1;
      const node = makeUserNode({
        status: 'invited',
        organization_capabilities: [
          {
            id: 'org-cap-1',
            organization: {
              id: 'organization-1',
              name: 'Org 1',
              personal_space: false,
            },
            capabilities: ['SETTINGS_ORGANIZATION'],
          },
          {
            id: 'org-cap-personal',
            organization: {
              id: 'organization-personal',
              name: 'Personal',
              personal_space: true,
            },
            capabilities: ['BYPASS'],
          },
        ],
      });
      mocks.edges = [{ node }];
      renderUserList();
      renderCell('actions', node);

      // When the resend menu item is clicked
      fireEvent.click(screen.getByText('UserListPage.ResendInvite'));

      // Then the adminAddUser mutation is called with the user's identity
      // and the capabilities for every non-personal-space organization only
      expect(mocks.commitMutation).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          variables: {
            input: {
              email: 'user-1@test.io',
              first_name: 'First',
              last_name: 'Last',
              organization_capabilities: [
                {
                  organization_id: 'organization-1',
                  capabilities: ['SETTINGS_ORGANIZATION'],
                },
              ],
            },
          },
        })
      );
    });
  });
});
