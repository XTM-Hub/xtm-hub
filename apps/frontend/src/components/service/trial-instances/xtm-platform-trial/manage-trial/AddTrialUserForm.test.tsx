import { AddTrialUserForm } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/AddTrialUserForm';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  AddUsersToBundleGroupsMutationVariables,
  BundleUserServiceGroupsQuery,
  PlatformIdentifier,
  ServiceGroupName,
  UsersQuery,
} from '@graphql/generated';
import {
  mockBundleUserServiceGroup,
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
