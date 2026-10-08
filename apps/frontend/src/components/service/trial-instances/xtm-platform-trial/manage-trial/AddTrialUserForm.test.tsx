import { AddTrialUserForm } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/AddTrialUserForm';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import {
  AddUsersToBundleGroupsMutationVariables,
  BundleUserServiceGroupsQuery,
  MeOrganizationDomainsQuery,
  OrganizationCapability,
  PlatformIdentifier,
  PortalCapability,
  ServiceGroupName,
  User,
  UserAccountStatus,
  UsersQuery,
  UsersQueryVariables,
} from '@graphql/generated';
import {
  mockBundleUserServiceGroup,
  mockOrganization,
  mockUser,
  mockUserConnection,
  mockUserEdge,
} from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@filigran/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/ui')>()),
  toast: toastMock,
}));

const GQL_OPERATION_BUNDLE_USER_SERVICE_GROUPS = 'BundleUserServiceGroups';
const GQL_OPERATION_USERS = 'Users';
const GQL_OPERATION_ADD_USERS_TO_BUNDLE_GROUPS = 'AddUsersToBundleGroups';
const GQL_OPERATION_ME_ORGANIZATION_DOMAINS = 'MeOrganizationDomains';

const bundleUserServiceGroupsResponse: BundleUserServiceGroupsQuery = {
  __typename: 'Query',
  bundleUserServiceGroups: [],
};

const usersResponse: UsersQuery = {
  __typename: 'Query',
  users: mockUserConnection({
    edges: [
      mockUserEdge({
        node: mockUser({ id: 'user-1', email: 'user1@filigran.io' }),
      }),
      mockUserEdge({
        node: mockUser({ id: 'user-2', email: 'user2@filigran.io' }),
      }),
    ],
  }),
};

const setupQueryMocks = () => {
  mswServer.use(
    mockGraphqlQuery({
      queryName: GQL_OPERATION_BUNDLE_USER_SERVICE_GROUPS,
      data: bundleUserServiceGroupsResponse,
    }),
    mockGraphqlQuery({
      queryName: GQL_OPERATION_USERS,
      data: usersResponse,
    })
  );
};

const openEmailDropdown = async (user: { click: (el: Element) => unknown }) => {
  await user.click(
    screen.getByText(
      'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
    )
  );
};

const getRoleCombobox = (title: string) =>
  screen.getByRole('combobox', { name: title });

describe('AddTrialUserForm', () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  it('renders the email field', async () => {
    setupQueryMocks();

    testRender(
      <AddTrialUserForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        onCompleted={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      await screen.findByText(
        'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
      )
    ).toBeInTheDocument();
  });

  it('excludes users who already have access to this trial from the email dropdown', async () => {
    mswServer.use(
      mockGraphqlQuery({
        queryName: GQL_OPERATION_BUNDLE_USER_SERVICE_GROUPS,
        data: {
          __typename: 'Query',
          bundleUserServiceGroups: [
            mockBundleUserServiceGroup({
              user: mockUser({ id: 'user-1', email: 'user1@filigran.io' }),
            }),
          ],
        } satisfies BundleUserServiceGroupsQuery,
      }),
      mockGraphqlQuery({
        queryName: GQL_OPERATION_USERS,
        data: usersResponse,
      })
    );

    const { user } = testRender(
      <AddTrialUserForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        onCompleted={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await screen.findByText(
      'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
    );

    await openEmailDropdown(user);

    expect(await screen.findByText('user2@filigran.io')).toBeInTheDocument();
    expect(screen.queryByText('user1@filigran.io')).not.toBeInTheDocument();
  });

  it('submits userIds and roles built from selected dropdown options, only including optional platforms when set', async () => {
    setupQueryMocks();

    let capturedVariables: AddUsersToBundleGroupsMutationVariables | undefined;
    mswServer.use(
      graphql.mutation(
        GQL_OPERATION_ADD_USERS_TO_BUNDLE_GROUPS,
        async ({ variables }) => {
          capturedVariables =
            variables as AddUsersToBundleGroupsMutationVariables;
          return HttpResponse.json({
            data: {
              addUsersToBundleGroups: [],
            },
          });
        }
      )
    );

    const onCompleted = vi.fn();
    const { user } = testRender(
      <AddTrialUserForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        onCompleted={onCompleted}
        onCancel={vi.fn()}
      />
    );

    await screen.findByText(
      'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
    );

    await openEmailDropdown(user);
    await user.click(await screen.findByText('user1@filigran.io'));

    await user.click(
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.opencti.Title')
    );
    await user.click(
      await screen.findByRole('option', {
        name: 'Service.Bundle.ManageTrial.Roles.opencti.Admin.Label',
      })
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });

    expect(capturedVariables).toEqual({
      serviceInstanceId: 'bundle-1',
      input: {
        userIds: ['user-1'],
        emails: null,
        roles: expect.arrayContaining([
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
        ]),
      },
    });
    expect(capturedVariables?.input.roles).toHaveLength(2);
  });

  it('shows a destructive toast and does not call onCompleted when the mutation fails', async () => {
    setupQueryMocks();
    mswServer.use(
      graphql.mutation(GQL_OPERATION_ADD_USERS_TO_BUNDLE_GROUPS, () =>
        HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] })
      )
    );

    const onCompleted = vi.fn();
    const { user } = testRender(
      <AddTrialUserForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        onCompleted={onCompleted}
        onCancel={vi.fn()}
      />
    );

    await screen.findByText(
      'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
    );

    await openEmailDropdown(user);
    await user.click(await screen.findByText('user1@filigran.io'));
    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Utils.Error',
        description: <>{'Error.Server.UNKNOWN_ERROR'}</>,
      });
    });
    expect(onCompleted).not.toHaveBeenCalled();
  });
});

const SEARCH_PLACEHOLDER = 'Search...';

const organizationUsers: User[] = [
  mockUser({ id: 'user-1', email: 'active@filigran.io', status: null }),
  mockUser({
    id: 'user-2',
    email: 'waiting@filigran.io',
    status: UserAccountStatus.Waiting,
  }),
  mockUser({
    id: 'user-3',
    email: 'expired@filigran.io',
    status: UserAccountStatus.Expired,
  }),
  mockUser({ id: 'member-1', email: 'member@filigran.io', status: null }),
];

// Selected organization of the user rendered by testRender
const SELECTED_ORGANIZATION_ID = 'org-test-456';
const ORGANIZATION_DOMAIN = 'filigran.io';
const OUTSIDE_EMAIL = 'new@outside.io';

const userManagerMe = {
  selected_org_capabilities: [OrganizationCapability.AdministrateOrganization],
};
const platformRegistrationManagerMe = {
  selected_org_capabilities: [
    OrganizationCapability.ManagePlatformRegistration,
  ],
};

const setupSearchableQueryMocks = () => {
  const searchedTerms: (string | null | undefined)[] = [];
  mswServer.use(
    mockGraphqlQuery({
      queryName: GQL_OPERATION_BUNDLE_USER_SERVICE_GROUPS,
      data: {
        __typename: 'Query',
        bundleUserServiceGroups: [
          mockBundleUserServiceGroup({
            user: mockUser({ id: 'member-1', email: 'member@filigran.io' }),
          }),
        ],
      } satisfies BundleUserServiceGroupsQuery,
    }),
    graphql.query(GQL_OPERATION_USERS, ({ variables }) => {
      const { searchTerm } = variables as UsersQueryVariables;
      searchedTerms.push(searchTerm);
      const edges = organizationUsers
        .filter(({ email }) => !searchTerm || email.includes(searchTerm))
        .map((node) => mockUserEdge({ node }));
      return HttpResponse.json({
        data: { users: mockUserConnection({ edges }) },
      });
    }),
    mockGraphqlQuery({
      queryName: GQL_OPERATION_ME_ORGANIZATION_DOMAINS,
      data: {
        __typename: 'Query',
        me: mockUser({
          organizations: [
            mockOrganization({
              id: SELECTED_ORGANIZATION_ID,
              domains: [ORGANIZATION_DOMAIN],
            }),
          ],
        }),
      } satisfies MeOrganizationDomainsQuery,
    })
  );
  return { searchedTerms };
};

const renderForm = (
  me: Partial<meContext_fragment$data> = userManagerMe,
  onCompleted = vi.fn()
) =>
  testRender(
    <AddTrialUserForm
      serviceInstanceId="bundle-1"
      products={Object.values(PlatformIdentifier)}
      onCompleted={onCompleted}
      onCancel={vi.fn()}
    />,
    { me }
  );

describe('AddTrialUserForm with the TRIAL_INVITE feature flag', () => {
  beforeEach(() => {
    toastMock.mockReset();
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
  });

  it('appends the invitation status to the users who are not active yet', async () => {
    setupSearchableQueryMocks();
    const { user } = renderForm();

    await openEmailDropdown(user);

    expect(
      await screen.findByText(
        'waiting@filigran.io (Service.Bundle.ManageTrial.AddUserDialog.Status.Invited)'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'expired@filigran.io (Service.Bundle.ManageTrial.AddUserDialog.Status.Expired)'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('active@filigran.io')).toBeInTheDocument();
  });

  it('offers to invite a typed email that matches no user of the organization', async () => {
    setupSearchableQueryMocks();
    const { user } = renderForm();

    await openEmailDropdown(user);
    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      'new@filigran.io'
    );

    expect(
      await screen.findByText(
        'Service.Bundle.ManageTrial.AddUserDialog.InviteEmail'
      )
    ).toBeInTheDocument();
  });

  it.each([
    { typed: 'active@filigran.io', reason: 'an organization user' },
    { typed: 'member@filigran.io', reason: 'a user of this trial' },
    { typed: 'not-an-email', reason: 'not a valid email' },
    { typed: OUTSIDE_EMAIL, reason: 'outside the organization domains' },
  ])('does not offer to invite $typed ($reason)', async ({ typed }) => {
    const { searchedTerms } = setupSearchableQueryMocks();
    const { user } = renderForm();

    await openEmailDropdown(user);
    await screen.findByText(/waiting@filigran.io/);
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), typed);

    await waitFor(() => {
      expect(searchedTerms).toContain(typed);
      expect(screen.queryByText(/waiting@filigran.io/)).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText('Service.Bundle.ManageTrial.AddUserDialog.InviteEmail')
    ).not.toBeInTheDocument();
  });

  it('sends the selected users and the new email to the trial in a single call', async () => {
    setupSearchableQueryMocks();
    let addUsersVariables: AddUsersToBundleGroupsMutationVariables | undefined;
    mswServer.use(
      graphql.mutation(
        GQL_OPERATION_ADD_USERS_TO_BUNDLE_GROUPS,
        ({ variables }) => {
          addUsersVariables =
            variables as AddUsersToBundleGroupsMutationVariables;
          return HttpResponse.json({ data: { addUsersToBundleGroups: [] } });
        }
      )
    );
    const onCompleted = vi.fn();
    const { user } = renderForm(userManagerMe, onCompleted);

    await openEmailDropdown(user);
    await user.click(await screen.findByText('active@filigran.io'));
    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      'new@filigran.io'
    );
    await user.click(
      await screen.findByText(
        'Service.Bundle.ManageTrial.AddUserDialog.InviteEmail'
      )
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
    expect(addUsersVariables?.input).toEqual(
      expect.objectContaining({
        userIds: ['user-1'],
        emails: ['new@filigran.io'],
      })
    );
  });

  it('shows a destructive toast and does not complete when an email is rejected', async () => {
    setupSearchableQueryMocks();
    mswServer.use(
      graphql.mutation(GQL_OPERATION_ADD_USERS_TO_BUNDLE_GROUPS, () =>
        HttpResponse.json({
          errors: [{ message: 'USER_DISABLED' }],
        })
      )
    );
    const onCompleted = vi.fn();
    const { user } = renderForm(userManagerMe, onCompleted);

    await openEmailDropdown(user);
    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      'new@filigran.io'
    );
    await user.click(
      await screen.findByText(
        'Service.Bundle.ManageTrial.AddUserDialog.InviteEmail'
      )
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Utils.Error',
        description: <>{'Error.Server.USER_DISABLED'}</>,
      });
    });
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('offers to invite an email outside the organization domains to a bypass user', async () => {
    setupSearchableQueryMocks();
    const { user } = renderForm({
      ...userManagerMe,
      capabilities: [{ name: PortalCapability.Bypass }],
    });

    await openEmailDropdown(user);
    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      OUTSIDE_EMAIL
    );

    expect(
      await screen.findByText(
        'Service.Bundle.ManageTrial.AddUserDialog.InviteEmail'
      )
    ).toBeInTheDocument();
  });

  it('warns users who cannot manage users and does not offer to invite', async () => {
    const { searchedTerms } = setupSearchableQueryMocks();
    const { user } = renderForm(platformRegistrationManagerMe);

    expect(
      await screen.findByText(
        'Service.Bundle.ManageTrial.AddUserDialog.NoPermissionToInvite'
      )
    ).toBeInTheDocument();

    await openEmailDropdown(user);
    await screen.findByText('active@filigran.io');
    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      'new@filigran.io'
    );

    await waitFor(() => {
      expect(searchedTerms).toContain('new@filigran.io');
      expect(screen.queryByText('active@filigran.io')).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText('Service.Bundle.ManageTrial.AddUserDialog.InviteEmail')
    ).not.toBeInTheDocument();
  });

  it('warns that expired users will be invited again when one is selected', async () => {
    setupSearchableQueryMocks();
    const { user } = renderForm();

    await openEmailDropdown(user);
    await user.click(
      await screen.findByText(
        'expired@filigran.io (Service.Bundle.ManageTrial.AddUserDialog.Status.Expired)'
      )
    );

    expect(
      screen.getByText(
        'Service.Bundle.ManageTrial.AddUserDialog.ExpiredUsersReinvited'
      )
    ).toBeInTheDocument();
  });

  it('does not show the re-invitation notice when no expired user is selected', async () => {
    setupSearchableQueryMocks();
    const { user } = renderForm();

    await openEmailDropdown(user);
    await user.click(await screen.findByText('active@filigran.io'));

    expect(
      screen.queryByText(
        'Service.Bundle.ManageTrial.AddUserDialog.ExpiredUsersReinvited'
      )
    ).not.toBeInTheDocument();
  });

  it('does not warn users who can manage users', async () => {
    setupSearchableQueryMocks();
    renderForm();

    await screen.findByText(
      'Service.Bundle.ManageTrial.AddUserDialog.EmailPlaceholder'
    );

    expect(
      screen.queryByText(
        'Service.Bundle.ManageTrial.AddUserDialog.NoPermissionToInvite'
      )
    ).not.toBeInTheDocument();
  });
});

describe('AddTrialUserForm without the TRIAL_INVITE feature flag', () => {
  beforeEach(() => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);
  });

  it('keeps plain labels, no warning, no server search and no invite', async () => {
    const { searchedTerms } = setupSearchableQueryMocks();
    const { user } = renderForm(platformRegistrationManagerMe);

    await openEmailDropdown(user);
    expect(await screen.findByText('waiting@filigran.io')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Service.Bundle.ManageTrial.AddUserDialog.NoPermissionToInvite'
      )
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      'new@filigran.io'
    );

    expect(
      screen.queryByText('Service.Bundle.ManageTrial.AddUserDialog.InviteEmail')
    ).not.toBeInTheDocument();
    expect(searchedTerms.every((searchTerm) => !searchTerm)).toBe(true);
  });
});
