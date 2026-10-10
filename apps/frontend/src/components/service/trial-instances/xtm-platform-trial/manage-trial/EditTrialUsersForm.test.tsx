import { EditTrialUsersForm } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/EditTrialUsersForm';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  BundleUserServiceGroupsQuery,
  PlatformIdentifier,
  ServiceGroupName,
  UpdateBundleUserGroupsMutationVariables,
} from '@graphql/generated';
import {
  mockBundleUserServiceGroup,
  mockUser,
  mockUserPlatformGroup,
} from '@graphql/mocks';
import { screen, waitFor, within } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showSnackbarMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

const GQL_OPERATION_BUNDLE_USER_SERVICE_GROUPS = 'BundleUserServiceGroups';
const GQL_OPERATION_UPDATE_BUNDLE_USER_GROUPS = 'UpdateBundleUserGroups';

const userOneAdminOpenctiUserXtmone = mockBundleUserServiceGroup({
  user: mockUser({ id: 'user-1', email: 'user1@filigran.io' }),
  groups: [
    mockUserPlatformGroup({
      platformIdentifier: PlatformIdentifier.Opencti,
      name: ServiceGroupName.Admin,
    }),
    mockUserPlatformGroup({
      platformIdentifier: PlatformIdentifier.Xtmone,
      name: ServiceGroupName.User,
    }),
  ],
});

const userTwoReaderOpenctiUserXtmone = mockBundleUserServiceGroup({
  user: mockUser({ id: 'user-2', email: 'user2@filigran.io' }),
  groups: [
    mockUserPlatformGroup({
      platformIdentifier: PlatformIdentifier.Opencti,
      name: ServiceGroupName.Reader,
    }),
    mockUserPlatformGroup({
      platformIdentifier: PlatformIdentifier.Xtmone,
      name: ServiceGroupName.Admin,
    }),
  ],
});

const bundleUserServiceGroupsResponse: BundleUserServiceGroupsQuery = {
  __typename: 'Query',
  bundleUserServiceGroups: [
    userOneAdminOpenctiUserXtmone,
    userTwoReaderOpenctiUserXtmone,
  ],
};

const setupQueryMocks = () => {
  mswServer.use(
    mockGraphqlQuery({
      queryName: GQL_OPERATION_BUNDLE_USER_SERVICE_GROUPS,
      data: bundleUserServiceGroupsResponse,
    })
  );
};

const getRoleCombobox = (title: string) =>
  screen.getByRole('combobox', { name: title });

// The helper text has no link to its select, so scope it to the platform's
// panel or another panel's text would match.
const getRoleFormItem = (title: string) => {
  const formItem = getRoleCombobox(title).closest<HTMLElement>('.md\\:flex-1');
  if (!formItem) {
    throw new Error(`No role panel found for ${title}`);
  }
  return formItem;
};

describe('EditTrialUsersForm', () => {
  beforeEach(() => {
    showSnackbarMock.mockReset();
  });

  it("preselects a single user's current roles without showing the mixed-roles helper text", async () => {
    setupQueryMocks();

    testRender(
      <EditTrialUsersForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        initialUserIds={['user-1']}
        onCompleted={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const openctiCombobox = await waitFor(() =>
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.opencti.Title')
    );
    await waitFor(() => {
      expect(openctiCombobox).toHaveTextContent(
        'Service.Bundle.ManageTrial.Roles.opencti.Admin.Label'
      );
    });

    const xtmoneCombobox = getRoleCombobox(
      'Service.Bundle.ManageTrial.Roles.xtmone.Title'
    );
    expect(xtmoneCombobox).toHaveTextContent(
      'Service.Bundle.ManageTrial.Roles.xtmone.User.Label'
    );

    expect(
      screen.queryByText(
        'Service.Bundle.ManageTrial.EditUsersDialog.MixedRoles'
      )
    ).not.toBeInTheDocument();
  });

  it('defaults an optional platform to "No access" and shows the mixed-roles helper text when selected users have different roles', async () => {
    setupQueryMocks();

    testRender(
      <EditTrialUsersForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        initialUserIds={['user-1', 'user-2']}
        onCompleted={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const openctiCombobox = await waitFor(() =>
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.opencti.Title')
    );
    await waitFor(() => {
      expect(openctiCombobox).toHaveTextContent(
        'Service.Bundle.ManageTrial.Roles.NoAccess'
      );
    });

    expect(
      within(
        getRoleFormItem('Service.Bundle.ManageTrial.Roles.opencti.Title')
      ).getByText('Service.Bundle.ManageTrial.EditUsersDialog.MixedRoles')
    ).toBeInTheDocument();
  });

  it('defaults the mandatory XTM One platform to the panel default role and shows the mixed-roles helper text when users differ', async () => {
    setupQueryMocks();

    testRender(
      <EditTrialUsersForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        initialUserIds={['user-1', 'user-2']}
        onCompleted={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const xtmoneCombobox = await waitFor(() =>
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.xtmone.Title')
    );
    await waitFor(() => {
      expect(xtmoneCombobox).toHaveTextContent(
        'Service.Bundle.ManageTrial.Roles.xtmone.User.Label'
      );
    });

    expect(
      within(
        getRoleFormItem('Service.Bundle.ManageTrial.Roles.xtmone.Title')
      ).getByText('Service.Bundle.ManageTrial.EditUsersDialog.MixedRoles')
    ).toBeInTheDocument();
  });

  it('never blanks the mandatory XTM One field while the bundle users are still loading, and shows the shared role once loaded', async () => {
    const userThreeAdminXtmone = mockBundleUserServiceGroup({
      user: mockUser({ id: 'user-3', email: 'user3@filigran.io' }),
      groups: [
        mockUserPlatformGroup({
          platformIdentifier: PlatformIdentifier.Xtmone,
          name: ServiceGroupName.Admin,
        }),
      ],
    });
    const userFourAdminXtmone = mockBundleUserServiceGroup({
      user: mockUser({ id: 'user-4', email: 'user4@filigran.io' }),
      groups: [
        mockUserPlatformGroup({
          platformIdentifier: PlatformIdentifier.Xtmone,
          name: ServiceGroupName.Admin,
        }),
      ],
    });

    let resolveQuery: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      resolveQuery = resolve;
    });
    mswServer.use(
      graphql.query(GQL_OPERATION_BUNDLE_USER_SERVICE_GROUPS, async () => {
        await pending;
        return HttpResponse.json({
          data: {
            __typename: 'Query',
            bundleUserServiceGroups: [
              userThreeAdminXtmone,
              userFourAdminXtmone,
            ],
          },
        });
      })
    );

    testRender(
      <EditTrialUsersForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        initialUserIds={['user-3', 'user-4']}
        onCompleted={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // The bundle users query is still pending (we haven't resolved it yet):
    // the mandatory XTM One field must keep its schema default, never blank.
    expect(
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.xtmone.Title')
    ).toHaveTextContent('Service.Bundle.ManageTrial.Roles.xtmone.User.Label');

    resolveQuery?.();

    await waitFor(() => {
      expect(
        getRoleCombobox('Service.Bundle.ManageTrial.Roles.xtmone.Title')
      ).toHaveTextContent(
        'Service.Bundle.ManageTrial.Roles.xtmone.Admin.Label'
      );
    });

    expect(
      within(
        getRoleFormItem('Service.Bundle.ManageTrial.Roles.xtmone.Title')
      ).queryByText('Service.Bundle.ManageTrial.EditUsersDialog.MixedRoles')
    ).not.toBeInTheDocument();
  });

  it('submits userIds and a full roles array (including revoked platforms as null) for every panel', async () => {
    setupQueryMocks();

    let capturedVariables: UpdateBundleUserGroupsMutationVariables | undefined;
    mswServer.use(
      graphql.mutation(
        GQL_OPERATION_UPDATE_BUNDLE_USER_GROUPS,
        async ({ variables }) => {
          capturedVariables =
            variables as UpdateBundleUserGroupsMutationVariables;
          return HttpResponse.json({
            data: { updateBundleUserGroups: [] },
          });
        }
      )
    );

    const onCompleted = vi.fn();
    const { user } = testRender(
      <EditTrialUsersForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        initialUserIds={['user-1']}
        onCompleted={onCompleted}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() =>
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.opencti.Title')
    );

    await user.click(
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.opencti.Title')
    );
    await user.click(
      await screen.findByRole('option', {
        name: 'Service.Bundle.ManageTrial.Roles.NoAccess',
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
        roles: expect.arrayContaining([
          { product: PlatformIdentifier.Opencti, role: null },
          { product: PlatformIdentifier.Openaev, role: null },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ]),
      },
    });
    expect(capturedVariables?.input.roles).toHaveLength(3);
  });

  it('shows a destructive toast and does not call onCompleted when the mutation fails', async () => {
    setupQueryMocks();
    mswServer.use(
      graphql.mutation(GQL_OPERATION_UPDATE_BUNDLE_USER_GROUPS, () =>
        HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] })
      )
    );

    const onCompleted = vi.fn();
    const { user } = testRender(
      <EditTrialUsersForm
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        initialUserIds={['user-1']}
        onCompleted={onCompleted}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() =>
      getRoleCombobox('Service.Bundle.ManageTrial.Roles.opencti.Title')
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));

    await waitFor(() => {
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: <>{'Error.Server.UNKNOWN_ERROR'}</>,
      });
    });
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
