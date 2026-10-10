import { ManageTrialTable } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialTable';
import { SelectionState } from '@/components/ui/data-table';
import testRender from '@/utils/test/test-render';
import {
  BundleUserServiceGroupsQuery,
  PlatformIdentifier,
  RemoveUsersFromBundleGroupsMutation,
  RemoveUsersFromBundleGroupsMutationVariables,
  ServiceGroupName,
  UpdateBundleUserGroupsMutation,
  UpdateBundleUserGroupsMutationVariables,
} from '@graphql/generated';
import {
  mockBundleUserServiceGroup,
  mockUser,
  mockUserPlatformGroup,
} from '@graphql/mocks';
import { UseMutationOptions } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const emptySelection: SelectionState = {
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
};

interface MockTableRow {
  id: string;
  email: string;
  openctiRole: string;
  openaevRole: string;
  xtmoneRole: string;
}

interface MockDataTableColumn {
  id: string;
  accessorKey?: keyof MockTableRow;
  cell?: (context: { row: { original: MockTableRow } }) => ReactNode;
}

type RemoveUsersFromBundleGroupsOptions = UseMutationOptions<
  RemoveUsersFromBundleGroupsMutation,
  unknown,
  RemoveUsersFromBundleGroupsMutationVariables,
  unknown
>;

type UpdateBundleUserGroupsOptions = UseMutationOptions<
  UpdateBundleUserGroupsMutation,
  unknown,
  UpdateBundleUserGroupsMutationVariables,
  unknown
>;

const graphqlMocks = vi.hoisted(() => ({
  useBundleUserServiceGroupsQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((_variables: unknown) => ['BundleUserServiceGroups']),
    getRootKey: vi.fn(() => ['BundleUserServiceGroups']),
  }),
  useRemoveUsersFromBundleGroupsMutation: vi.fn(),
  useUpdateBundleUserGroupsMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...actual,
    useBundleUserServiceGroupsQuery:
      graphqlMocks.useBundleUserServiceGroupsQuery,
    useRemoveUsersFromBundleGroupsMutation:
      graphqlMocks.useRemoveUsersFromBundleGroupsMutation,
    useUpdateBundleUserGroupsMutation:
      graphqlMocks.useUpdateBundleUserGroupsMutation,
  };
});

const showSnackbarMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

vi.mock('@/components/ui/data-table', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/ui/data-table')>();
  return {
    ...actual,
    DataTable: ({
      data,
      isLoading,
      columns,
    }: {
      data: MockTableRow[];
      isLoading?: boolean;
      columns: MockDataTableColumn[];
    }) => (
      <div>
        {isLoading ? <div>loading</div> : null}
        {data.map((row) => (
          <div key={row.id}>
            {columns.map((column) => (
              <div
                key={column.id}
                data-testid={`cell-${row.id}-${column.id}`}>
                {column.cell
                  ? column.cell({ row: { original: row } })
                  : column.accessorKey
                    ? row[column.accessorKey]
                    : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  };
});

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

const baseQueryResponse: BundleUserServiceGroupsQuery = {
  __typename: 'Query',
  bundleUserServiceGroups: [userOneAdminOpenctiUserXtmone],
};

const openDeleteDialog = async (
  user: { click: (el: Element) => unknown },
  dialogTitle = 'Service.Bundle.ManageTrial.Table.DeleteDialog.Title'
) => {
  await user.click(await screen.findByLabelText('Utils.Delete'));
  return screen.getByRole('alertdialog', { name: dialogTitle });
};

const getRoleCell = (userId: string, columnId: string) =>
  screen.getByTestId(`cell-${userId}-${columnId}`);

const getRoleCombobox = (userId: string, columnId: string) =>
  within(getRoleCell(userId, columnId)).getByRole('combobox');

describe('ManageTrialTable', () => {
  beforeEach(() => {
    showSnackbarMock.mockReset();
    graphqlMocks.useRemoveUsersFromBundleGroupsMutation.mockReturnValue({
      mutate: vi.fn(),
    });
    graphqlMocks.useUpdateBundleUserGroupsMutation.mockReturnValue({
      mutate: vi.fn(),
    });
  });

  it('renders bundle users from query data', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });

    testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    expect(await screen.findByText('user1@filigran.io')).toBeInTheDocument();
  });

  it('sorts rows by email regardless of the order returned by the query', async () => {
    const userCharlie = mockBundleUserServiceGroup({
      user: mockUser({ id: 'user-charlie', email: 'charlie@filigran.io' }),
      groups: [],
    });
    const userAlice = mockBundleUserServiceGroup({
      user: mockUser({ id: 'user-alice', email: 'alice@filigran.io' }),
      groups: [],
    });
    const userBob = mockBundleUserServiceGroup({
      user: mockUser({ id: 'user-bob', email: 'bob@filigran.io' }),
      groups: [],
    });
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: {
        __typename: 'Query',
        bundleUserServiceGroups: [userCharlie, userAlice, userBob],
      },
      isError: false,
      isLoading: false,
    });

    testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    await screen.findByText('alice@filigran.io');

    const emails = screen
      .getAllByTestId(/^cell-.*-email$/)
      .map((cell) => cell.textContent);
    expect(emails).toEqual([
      'alice@filigran.io',
      'bob@filigran.io',
      'charlie@filigran.io',
    ]);
  });

  it('shows error message when query fails', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });

    testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
  });

  it('shows empty state when there are no bundle users', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: { __typename: 'Query', bundleUserServiceGroups: [] },
      isError: false,
      isLoading: false,
    });

    testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    expect(
      await screen.findByText('Service.Bundle.ManageTrial.Table.NoUsers')
    ).toBeInTheDocument();
  });

  it('passes serviceInstanceId as a query variable', () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });

    testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    const lastCall =
      graphqlMocks.useBundleUserServiceGroupsQuery.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ serviceInstanceId: 'bundle-1' });
  });

  it('asks for confirmation and calls the remove mutation with the row user id when confirmed', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });
    const mutate = vi.fn();
    graphqlMocks.useRemoveUsersFromBundleGroupsMutation.mockReturnValue({
      mutate,
    });

    const { user } = testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    const dialog = await openDeleteDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Utils.Delete' })
    );

    expect(mutate).toHaveBeenCalledWith({
      serviceInstanceId: 'bundle-1',
      userIds: ['user-1'],
    });
  });

  it('shows a success toast when the removal succeeds', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });
    graphqlMocks.useRemoveUsersFromBundleGroupsMutation.mockImplementation(
      (_client: unknown, options?: RemoveUsersFromBundleGroupsOptions) => ({
        mutate: (variables: RemoveUsersFromBundleGroupsMutationVariables) =>
          options?.onSuccess?.(
            { removeUsersFromBundleGroups: variables.userIds },
            variables,
            undefined
          ),
      })
    );

    const { user } = testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    const dialog = await openDeleteDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Utils.Delete' })
    );

    await waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'success',
        title: 'Utils.Success',
      })
    );
  });

  it('shows a destructive toast when the removal fails', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });
    graphqlMocks.useRemoveUsersFromBundleGroupsMutation.mockImplementation(
      (_client: unknown, options?: RemoveUsersFromBundleGroupsOptions) => ({
        mutate: (variables: RemoveUsersFromBundleGroupsMutationVariables) =>
          options?.onError?.(new Error('UnknownError'), variables, undefined),
      })
    );

    const { user } = testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    const dialog = await openDeleteDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Utils.Delete' })
    );

    await waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          title: 'Utils.Error',
        })
      )
    );
  });

  it("renders the user's current role in each platform's select", async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });

    testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    expect(
      await screen.findByTestId('cell-user-1-opencti_role')
    ).toHaveTextContent('Service.Bundle.ManageTrial.Roles.opencti.Admin.Label');
    expect(getRoleCombobox('user-1', 'openaev_role')).toHaveTextContent(
      'Service.Bundle.ManageTrial.Roles.NoAccess'
    );
    expect(getRoleCombobox('user-1', 'xtmone_role')).toHaveTextContent(
      'Service.Bundle.ManageTrial.Roles.xtmone.User.Label'
    );
  });

  it('only renders role columns for the given products', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });

    testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={[PlatformIdentifier.Opencti]}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    expect(
      await screen.findByTestId('cell-user-1-opencti_role')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('cell-user-1-openaev_role')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('cell-user-1-xtmone_role')
    ).not.toBeInTheDocument();
  });

  it('calls the update mutation with only the changed platform role when selecting a new role', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });
    const mutate = vi.fn();
    graphqlMocks.useUpdateBundleUserGroupsMutation.mockReturnValue({
      mutate,
    });

    const { user } = testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    await user.click(getRoleCombobox('user-1', 'opencti_role'));
    await user.click(
      screen.getByRole('option', {
        name: 'Service.Bundle.ManageTrial.Roles.opencti.Analyst.Label',
      })
    );

    expect(mutate).toHaveBeenCalledWith({
      serviceInstanceId: 'bundle-1',
      input: {
        userIds: ['user-1'],
        roles: [
          {
            product: PlatformIdentifier.Opencti,
            role: ServiceGroupName.Analyst,
          },
        ],
      },
    });
  });

  it('does not call the update mutation when reselecting the current role', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });
    const mutate = vi.fn();
    graphqlMocks.useUpdateBundleUserGroupsMutation.mockReturnValue({
      mutate,
    });

    const { user } = testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    await user.click(getRoleCombobox('user-1', 'opencti_role'));
    await user.click(
      screen.getByRole('option', {
        name: 'Service.Bundle.ManageTrial.Roles.opencti.Admin.Label',
      })
    );

    expect(mutate).not.toHaveBeenCalled();
  });

  it('shows a success toast when a role update succeeds', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });
    graphqlMocks.useUpdateBundleUserGroupsMutation.mockImplementation(
      (_client: unknown, options?: UpdateBundleUserGroupsOptions) => ({
        mutate: (variables: UpdateBundleUserGroupsMutationVariables) =>
          options?.onSuccess?.(
            {
              updateBundleUserGroups: [
                mockBundleUserServiceGroup({
                  user: mockUser({
                    id: 'user-1',
                    email: 'user1@filigran.io',
                  }),
                  groups: [
                    mockUserPlatformGroup({
                      platformIdentifier: PlatformIdentifier.Opencti,
                      name: ServiceGroupName.Analyst,
                    }),
                  ],
                }),
              ],
            },
            variables,
            undefined
          ),
      })
    );

    const { user } = testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    await user.click(getRoleCombobox('user-1', 'opencti_role'));
    await user.click(
      screen.getByRole('option', {
        name: 'Service.Bundle.ManageTrial.Roles.opencti.Analyst.Label',
      })
    );

    await waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'success',
        title: 'Service.Bundle.ManageTrial.Table.RoleUpdated',
      })
    );
  });

  it('shows a destructive toast when a role update fails', async () => {
    graphqlMocks.useBundleUserServiceGroupsQuery.mockReturnValue({
      data: baseQueryResponse,
      isError: false,
      isLoading: false,
    });
    graphqlMocks.useUpdateBundleUserGroupsMutation.mockImplementation(
      (_client: unknown, options?: UpdateBundleUserGroupsOptions) => ({
        mutate: (variables: UpdateBundleUserGroupsMutationVariables) =>
          options?.onError?.(new Error('UnknownError'), variables, undefined),
      })
    );

    const { user } = testRender(
      <ManageTrialTable
        serviceInstanceId="bundle-1"
        products={Object.values(PlatformIdentifier)}
        selection={emptySelection}
        onSelectionChange={vi.fn()}
      />
    );

    await user.click(getRoleCombobox('user-1', 'opencti_role'));
    await user.click(
      screen.getByRole('option', {
        name: 'Service.Bundle.ManageTrial.Roles.opencti.Analyst.Label',
      })
    );

    await waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          title: 'Utils.Error',
        })
      )
    );
  });
});
