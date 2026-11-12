import { canDeleteUserRow } from '@/components/admin/user/delete-user.utils';
import { DeleteUser } from '@/components/admin/user/DeleteUser';
import { AddUser } from '@/components/admin/user/forms/AddUser';
import { AdminAddUser } from '@/components/admin/user/forms/admin/AdminAddUser';
import { EditUser } from '@/components/admin/user/forms/UserUpdate';
import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import {
  canResendInvite,
  getOrganizationCapabilities,
  toAdminResendInviteInput,
  toResendInviteInput,
} from '@/components/admin/user/user-list.utils';
import { UserOrganizationFilter } from '@/components/admin/user/UserOrganizationFilter';
import { PortalContext } from '@/components/me/AppPortalContext';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
} from '@/components/ui/data-table';
import {
  handleSortingChange,
  mapToSortingTableValue,
} from '@/components/ui/handle-sorting.utils';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import useAdminPath from '@/hooks/use-admin-path';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useGraphqlSubscription } from '@/hooks/use-graphql-subscription';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useDateFormatter } from '@/utils/date';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { Button, Chip, SearchField } from '@filigran/design-system';
import { MoreVertIcon } from '@filigran/icon';
import {
  AdminUserEventsDocument,
  AdminUserEventsSubscription,
  FilterKey,
  OrganizationUserEventsDocument,
  OrganizationUserEventsSubscription,
  OrganizationUserEventsSubscriptionVariables,
  UserAccountStatus,
  UsersListQueryVariables,
  useUserAdminResendInviteMutation,
  useUserResendInviteMutation,
  useUsersListQuery,
} from '@graphql/generated';
import { usersListKeys } from '@graphql/user/users.keys';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, Row } from '@tanstack/react-table';
import {
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { graphql } from 'react-relay';

// Still spread by the Relay user mutations until they move to react-query.
export const UserFragment = graphql`
  fragment UserList_fragment on User @inline {
    id
    email
    last_name
    first_name
    disabled
    last_login
    country
    status
    invitation_date
    organization_capabilities {
      id
      organization {
        id
        name
        personal_space
      }
      capabilities
    }
  }
`;

interface UserListProps {
  organization?: string;
}

// Component
const UserList = ({ organization }: UserListProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const {
    pageSize,
    setPageSize,
    orderMode,
    setOrderMode,
    orderBy,
    setOrderBy,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    organizationFilter,
    setOrganizationFilter,
    resetAll,
    removeOrder,
  } = useUserListLocalstorage();

  const isAdminPath = useAdminPath();
  const canDeleteUser = useAdminByPass();
  const hasActionsColumn = isAdminPath && canDeleteUser;
  const hasResendButtonColumn = !isAdminPath;
  const { me } = useContext(PortalContext);
  const [userEdit, setUserEdit] = useState<UsersListUser | undefined>(
    undefined
  );
  const [userToDelete, setUserToDelete] = useState<UsersListUser | undefined>(
    undefined
  );

  const [filter, setFilter] = useState<{
    search?: string;
    organization?: string;
  }>({
    search: undefined,
    organization: isAdminPath ? organizationFilter : organization,
  });

  const { pagination, cursor, setPagination, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
    });

  const variables = useMemo<UsersListQueryVariables>(
    () => ({
      first: pagination.pageSize,
      after: cursor,
      orderBy,
      orderMode,
      searchTerm: filter.search ?? null,
      filters: filter.organization
        ? [{ key: FilterKey.OrganizationId, value: [filter.organization] }]
        : null,
    }),
    [pagination.pageSize, cursor, orderBy, orderMode, filter]
  );

  const { data, isLoading } = useUsersListQuery(
    portalGraphqlClient,
    variables,
    {
      // A page, sort, search or filter change keeps the current rows until
      // its results arrive.
      placeholderData: keepPreviousData,
      // Like Relay, a failed load reaches the error page; a failed background
      // refetch keeps the rows shown.
      throwOnError: (_error, query) => query.state.data === undefined,
      // Always stale, as the Relay store-and-network policy: showing the list
      // again (the tabs unmount it), or a search, filter, sort, page size or
      // page already in the cache, reloads it. Coming back to the browser tab
      // does not, as with Relay.
      staleTime: 0,
      refetchOnWindowFocus: false,
    }
  );

  const queryClient = useQueryClient();
  const refreshUsers = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: usersListKeys.list(variables),
      exact: true,
    });
  }, [queryClient, variables]);

  const resendInviteMutationOptions = {
    onSuccess: () => {
      showSnackbar({
        severity: 'success',
        title: t('Utils.Success'),
        description: t('UserListPage.ResendInviteSuccess'),
      });
      refreshUsers();
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'UnknownError';
      showSnackbar({
        severity: 'error',
        title: t('Utils.Error'),
        description: t(`Error.Server.${errorMessage}`),
      });
    },
  };
  const { mutate: resendInvite, isPending: isResendInvitePending } =
    useUserResendInviteMutation(
      portalGraphqlClient,
      resendInviteMutationOptions
    );
  const { mutate: adminResendInvite, isPending: isAdminResendInvitePending } =
    useUserAdminResendInviteMutation(
      portalGraphqlClient,
      resendInviteMutationOptions
    );
  const isResendingInvite = isResendInvitePending || isAdminResendInvitePending;
  const handleResendInvite = useCallback(
    (event: SyntheticEvent, user: UsersListUser) => {
      event.stopPropagation();
      if (isAdminPath) {
        adminResendInvite({ input: toAdminResendInviteInput(user) });
        return;
      }
      resendInvite({
        input: toResendInviteInput(user, me?.selected_organization_id),
      });
    },
    [adminResendInvite, isAdminPath, me?.selected_organization_id, resendInvite]
  );

  // A new user reloads the list on screen, in place of the Relay @appendNode.
  useGraphqlSubscription<
    OrganizationUserEventsSubscription,
    OrganizationUserEventsSubscriptionVariables
  >(
    OrganizationUserEventsDocument,
    { organizationId: organization ?? '' },
    {
      enabled: !isAdminPath && !!organization,
      onNext: ({ User }) => {
        if (User?.add) {
          refreshUsers();
        }
      },
    }
  );
  useGraphqlSubscription<AdminUserEventsSubscription>(
    AdminUserEventsDocument,
    {},
    {
      enabled: isAdminPath,
      onNext: ({ AdminUser }) => {
        if (AdminUser?.add) {
          refreshUsers();
        }
      },
    }
  );

  const columns: ColumnDef<UsersListUser>[] = useMemo(
    () => [
      {
        accessorKey: 'email',
        id: 'email',
        header: t('UserListPage.Email'),
        cell: ({ row }) => {
          return <span className="truncate">{row.original.email}</span>;
        },
      },
      {
        accessorKey: 'first_name',
        id: 'first_name',
        header: t('UserListPage.FirstName'),
        cell: ({ row }) => {
          return <span className="truncate">{row.original.first_name}</span>;
        },
      },
      {
        accessorKey: 'last_name',
        id: 'last_name',
        header: t('UserListPage.LastName'),
        cell: ({ row }) => {
          return <span className="truncate">{row.original.last_name}</span>;
        },
      },
      ...(isAdminPath
        ? [
            {
              accessorKey: 'organizations',
              id: 'organizations',
              header: t('UserListPage.Organizations'),
              enableSorting: false,
              cell: ({ row }: { row: Row<UsersListUser> }) => {
                return (
                  <div className="flex gap-1">
                    {row.original.organization_capabilities?.map(
                      ({ id, organization: { name, personal_space } }) =>
                        !personal_space ? (
                          <Chip
                            key={id}
                            label={name}
                          />
                        ) : null
                    )}
                  </div>
                );
              },
            },
            {
              accessorKey: 'country',
              id: 'country',
              header: t('UserListPage.Country'),
            },
            {
              accessorKey: 'disabled',
              id: 'disabled',
              header: t('UserListPage.Status'),
              cell: ({
                row: {
                  original: { disabled },
                },
              }: {
                row: { original: UsersListUser };
              }) => {
                return (
                  <div className="flex gap-1">
                    <Chip
                      label={t(disabled ? 'Badge.Disabled' : 'Badge.Enabled')}
                      severity={disabled ? 'critical' : 'low'}
                    />
                  </div>
                );
              },
            },
            {
              accessorKey: 'last_login',
              id: 'last_login',
              header: t('UserListPage.LastLogin'),
              cell: ({ row }: { row: { original: UsersListUser } }) => {
                return (
                  <span className="truncate">
                    {row.original.last_login
                      ? formatDate(row.original.last_login, 'DATE_FULL')
                      : '-'}
                  </span>
                );
              },
            },
          ]
        : [
            {
              accessorKey: 'capability',
              id: 'capability',
              header: t('UserListPage.Capability'),
              cell: ({ row }: { row: { original: UsersListUser } }) => {
                // As non-admin path, we should return only one organization
                if (row.original.organization_capabilities) {
                  const capabilities = getOrganizationCapabilities(
                    row.original.organization_capabilities,
                    me?.selected_organization_id
                  ).map(
                    (capability) =>
                      ({
                        id: capability,
                        name: capability,
                      }) as BadgeOverflow
                  );
                  return <BadgeOverflowCounter badges={capabilities} />;
                }
                return null;
              },
            },
          ]),
      {
        accessorKey: 'status',
        id: 'invitation_status',
        header: t('UserListPage.InvitationStatus'),
        enableSorting: false,
        cell: ({
          row: {
            original: { status },
          },
        }: {
          row: { original: UsersListUser };
        }) => {
          if (
            status === UserAccountStatus.Waiting ||
            status === UserAccountStatus.Invited
          ) {
            return (
              <Chip
                label={t('UserListPage.InvitationPending')}
                severity="medium"
              />
            );
          }
          if (status === UserAccountStatus.Expired) {
            return (
              <Chip
                label={t('UserListPage.InvitationExpired')}
                severity="critical"
              />
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'invitation_date',
        id: 'invitation_date',
        header: t('UserListPage.InvitationDate'),
        cell: ({ row }: { row: { original: UsersListUser } }) => {
          return (
            <span className="truncate">
              {row.original.invitation_date
                ? formatDate(row.original.invitation_date, 'DATE_FULL')
                : '-'}
            </span>
          );
        },
      },
      ...(hasResendButtonColumn
        ? [
            {
              id: 'invitation_action',
              enableHiding: false,
              enableSorting: false,
              enableResizing: false,
              header: t('UserListPage.Action'),
              cell: ({ row }: { row: { original: UsersListUser } }) => {
                if (!canResendInvite(row.original.status)) return null;
                return (
                  <Button
                    {...analyticsId('organization_member_invite')}
                    disabled={isResendingInvite}
                    onClick={(event) =>
                      handleResendInvite(event, row.original)
                    }>
                    {t('UserListPage.ResendInvite')}
                  </Button>
                );
              },
            },
          ]
        : []),
      ...(hasActionsColumn
        ? [
            {
              id: 'actions',
              size: 100,
              enableHiding: false,
              enableSorting: false,
              enableResizing: false,
              cell: ({ row }: { row: Row<UsersListUser> }) => {
                const canDelete = canDeleteUserRow(row.original.id, me?.id);
                const showResendInvite = canResendInvite(row.original.status);
                return (
                  // eslint-disable-next-line no-restricted-syntax -- container whose children carry the IDs
                  <div
                    className="flex items-center justify-end"
                    onClick={(event) => event.stopPropagation()}>
                    <IconActions
                      analyticsId="list_row_actions_open"
                      aria-label={t('Utils.OpenMenu')}
                      icon={
                        <MoreVertIcon className="h-4 w-4 text-icon-highlight" />
                      }>
                      {showResendInvite && (
                        <IconActionsItem
                          {...analyticsId('admin_user_invite')}
                          disabled={isResendingInvite}
                          onClick={(event) =>
                            handleResendInvite(event, row.original)
                          }>
                          {t('UserListPage.ResendInvite')}
                        </IconActionsItem>
                      )}
                      <IconActionsItem
                        {...analyticsId('admin_user_delete')}
                        disabled={!canDelete}
                        onClick={() => setUserToDelete(row.original)}>
                        {t('Utils.Delete')}
                      </IconActionsItem>
                    </IconActions>
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [
      hasActionsColumn,
      hasResendButtonColumn,
      handleResendInvite,
      isAdminPath,
      isResendingInvite,
      me?.id,
      me?.selected_organization_id,
      t,
      formatDate,
    ]
  );

  useEffect(() => {
    if (columnOrder.length === 0) {
      const defaultColumnOrder = columns.map((c) => c.id!);
      setColumnOrder(defaultColumnOrder);
    }
  }, [columnOrder.length, columns, setColumnOrder]);

  const userData = useMemo<UsersListUser[]>(
    () => data?.users.edges.map(({ node }) => node) ?? [],
    [data]
  );

  const onSortingChange = (updater: unknown) => {
    handleSortingChange({
      updater,
      removeOrder,
      setOrderBy,
      setOrderMode,
      orderBy,
      orderMode,
      handleRefetchData: () => undefined,
    });
  };

  const handleInputChange = (inputValue: string) => {
    setFilter((prevFilter) => ({ ...prevFilter, search: inputValue }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleOrganizationChange = (organizationId: string | undefined) => {
    setOrganizationFilter(organizationId);
    setFilter((prevFilter) => ({
      ...prevFilter,
      organization: organizationId,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const searchHandlers = useDebouncedSearch({
    apply: handleInputChange,
    appliedTerm: filter.search,
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={userData}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange: onSortingChange,
          onPaginationChange: onPaginationChange,
          onColumnOrderChange: setColumnOrder,
          onColumnVisibilityChange: setColumnVisibility,
          manualSorting: true,
          manualPagination: true,
          rowCount: data?.users.totalCount ?? 0,
          enableRowSelection: (row) => row.original.id !== me!.id,
        }}
        getRowAnalyticsId={() =>
          isAdminPath ? 'admin_user_edit' : 'organization_member_edit'
        }
        onClickRow={(row) => setUserEdit(row.original)}
        toolbar={
          <DataTableToolbar
            search={
              <SearchField
                fullWidth
                aria-label={t('UserActions.SearchUser')}
                placeholder={t('UserActions.SearchUser')}
                clearLabel={t('DesignSystem.SearchField.Clear')}
                onChange={searchHandlers.onChange}
                onClear={searchHandlers.onClear}
              />
            }
            filters={
              isAdminPath && (
                <UserOrganizationFilter
                  value={filter.organization}
                  onChange={handleOrganizationChange}
                />
              )
            }
            actions={
              <>
                <DataTableHeadBarOptions />
                {isAdminPath ? <AdminAddUser /> : <AddUser />}
              </>
            }
          />
        }
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
          columnOrder,
          columnVisibility,
          columnPinning: {
            right: hasActionsColumn ? ['actions'] : [],
          },
        }}
      />
      {data?.users.totalCount === 0 && (
        <p className="mt-4 text-center text-sm text-default-secondary">
          {t('UserListPage.NoUsers')}
        </p>
      )}
      {userEdit && (
        <EditUser
          user={userEdit}
          key={userEdit?.id}
          defaultStateOpen={!!userEdit}
          onCloseSheet={() => setUserEdit(undefined)}
        />
      )}
      {userToDelete && (
        <DeleteUser
          key={userToDelete.id}
          user={userToDelete}
          onUserDeleted={refreshUsers}
          open={!!userToDelete}
          setOpen={(open) => {
            if (!open) {
              setUserToDelete(undefined);
            }
          }}
        />
      )}
    </>
  );
};

// Component export
export default UserList;
