import { ManageTrialHeader } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialHeader';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  BundleUserServiceGroupsQuery,
  PlatformIdentifier,
  RemoveUsersFromBundleGroupsMutationVariables,
  UsersQuery,
} from '@graphql/generated';
import { mockUserConnection } from '@graphql/mocks';
import { screen, waitFor, within } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@filigran/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/ui')>()),
  toast: toastMock,
}));

const GQL_OPERATION_REMOVE_USERS_FROM_BUNDLE_GROUPS =
  'RemoveUsersFromBundleGroups';

const bundleUserServiceGroupsResponse: BundleUserServiceGroupsQuery = {
  __typename: 'Query',
  bundleUserServiceGroups: [],
};

const usersResponse: UsersQuery = {
  __typename: 'Query',
  users: mockUserConnection({ edges: [] }),
};

const setupQueryMocks = () => {
  mswServer.use(
    mockGraphqlQuery({
      queryName: 'BundleUserServiceGroups',
      data: bundleUserServiceGroupsResponse,
    }),
    mockGraphqlQuery({ queryName: 'Users', data: usersResponse })
  );
};

const openBulkDeleteDialog = async (user: {
  click: (el: Element) => unknown;
}) => {
  await user.click(screen.getByLabelText('Utils.Delete'));
  return screen.getByRole('alertdialog');
};

describe('ManageTrialHeader', () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  it('links the back button to the XTM Platform Trial page by default', () => {
    setupQueryMocks();

    testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[]}
        onUsersRemoved={vi.fn()}
      />
    );

    expect(
      screen.getByRole('link', {
        name: 'Service.Bundle.ManageTrial.BackButton',
      })
    ).toHaveAttribute('href', '/app/service/xtm-platform-trial');
  });

  it('uses the provided back link when overridden', () => {
    setupQueryMocks();

    testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[]}
        onUsersRemoved={vi.fn()}
        backHref="/app/admin/manage-trials"
        backLabelKey="Service.Bundle.ManageTrial.BackToDashboardButton"
      />
    );

    expect(
      screen.getByRole('link', {
        name: 'Service.Bundle.ManageTrial.BackToDashboardButton',
      })
    ).toHaveAttribute('href', '/app/admin/manage-trials');
  });

  it('opens the add trial user dialog when the button is clicked', async () => {
    setupQueryMocks();

    const { user } = testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[]}
        onUsersRemoved={vi.fn()}
      />
    );

    expect(
      screen.queryByText('Service.Bundle.ManageTrial.AddUserDialog.Title')
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Service.Bundle.ManageTrial.AddTrialUser',
      })
    );

    expect(
      await screen.findByText('Service.Bundle.ManageTrial.AddUserDialog.Title')
    ).toBeInTheDocument();
  });

  it('only shows role pickers for the given products in the add trial user dialog', async () => {
    setupQueryMocks();

    const { user } = testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={[PlatformIdentifier.Xtmone]}
        selectedUsers={[]}
        onUsersRemoved={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Service.Bundle.ManageTrial.AddTrialUser',
      })
    );

    expect(
      await screen.findByText('Service.Bundle.ManageTrial.Roles.xtmone.Title', {
        selector: 'label',
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Service.Bundle.ManageTrial.Roles.opencti.Title', {
        selector: 'label',
      })
    ).not.toBeInTheDocument();
  });

  it('does not show the bulk-delete button when no users are selected', () => {
    setupQueryMocks();

    testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[]}
        onUsersRemoved={vi.fn()}
      />
    );

    expect(screen.queryByLabelText('Utils.Delete')).not.toBeInTheDocument();
  });

  it('disables the GroupAction button when no users are selected', () => {
    setupQueryMocks();

    testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[]}
        onUsersRemoved={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button', {
      name: 'Service.Bundle.ManageTrial.GroupAction',
    });
    expect(buttons.some((button) => button.hasAttribute('disabled'))).toBe(
      true
    );
  });

  it('enables the GroupAction button when users are selected', () => {
    setupQueryMocks();

    testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[{ id: 'user-1', email: 'user1@filigran.io' }]}
        onUsersRemoved={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', {
        name: 'Service.Bundle.ManageTrial.GroupAction',
      })
    ).not.toBeDisabled();
  });

  it('opens the edit users dialog when the GroupAction button is clicked', async () => {
    setupQueryMocks();

    const { user } = testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[{ id: 'user-1', email: 'user1@filigran.io' }]}
        onUsersRemoved={vi.fn()}
      />
    );

    expect(
      screen.queryByText('Service.Bundle.ManageTrial.EditUsersDialog.Title')
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Service.Bundle.ManageTrial.GroupAction',
      })
    );

    expect(
      await screen.findByText(
        'Service.Bundle.ManageTrial.EditUsersDialog.Title'
      )
    ).toBeInTheDocument();
  });

  it('shows the bulk-delete button and dialog with the correct title and text keys when users are selected', async () => {
    setupQueryMocks();

    const { user } = testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[
          { id: 'user-1', email: 'user1@filigran.io' },
          { id: 'user-2', email: 'user2@filigran.io' },
        ]}
        onUsersRemoved={vi.fn()}
      />
    );

    const dialog = await openBulkDeleteDialog(user);

    expect(
      within(dialog).getByText(
        'Service.Bundle.ManageTrial.BulkDeleteDialog.Title'
      )
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Service.Bundle.ManageTrial.BulkDeleteDialog.Text'
      )
    ).toBeInTheDocument();
  });

  it('calls the remove mutation with every selected user id, shows a success toast and clears the selection', async () => {
    setupQueryMocks();
    let capturedVariables:
      RemoveUsersFromBundleGroupsMutationVariables | undefined;
    mswServer.use(
      graphql.mutation(
        GQL_OPERATION_REMOVE_USERS_FROM_BUNDLE_GROUPS,
        async ({ variables }) => {
          capturedVariables =
            variables as RemoveUsersFromBundleGroupsMutationVariables;
          return HttpResponse.json({
            data: { removeUsersFromBundleGroups: capturedVariables.userIds },
          });
        }
      )
    );

    const onUsersRemoved = vi.fn();
    const { user } = testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[
          { id: 'user-1', email: 'user1@filigran.io' },
          { id: 'user-2', email: 'user2@filigran.io' },
        ]}
        onUsersRemoved={onUsersRemoved}
      />
    );

    const dialog = await openBulkDeleteDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Utils.Delete' })
    );

    await waitFor(() => {
      expect(capturedVariables).toEqual({
        serviceInstanceId: 'bundle-1',
        userIds: ['user-1', 'user-2'],
      });
    });
    expect(toastMock).toHaveBeenCalledWith({ title: 'Utils.Success' });
    expect(onUsersRemoved).toHaveBeenCalledTimes(1);
  });

  it('shows a destructive toast and keeps the selection when the removal fails', async () => {
    setupQueryMocks();
    mswServer.use(
      graphql.mutation(GQL_OPERATION_REMOVE_USERS_FROM_BUNDLE_GROUPS, () =>
        HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] })
      )
    );

    const onUsersRemoved = vi.fn();
    const { user } = testRender(
      <ManageTrialHeader
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selectedUsers={[{ id: 'user-1', email: 'user1@filigran.io' }]}
        onUsersRemoved={onUsersRemoved}
      />
    );

    const dialog = await openBulkDeleteDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Utils.Delete' })
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Utils.Error',
        })
      );
    });
    expect(onUsersRemoved).not.toHaveBeenCalled();
  });
});
