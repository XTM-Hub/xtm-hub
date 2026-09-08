import { canDeleteUserRow } from '@/components/admin/user/delete-user.utils';
import { DeleteUser } from '@/components/admin/user/DeleteUser';
import { EditUser } from '@/components/admin/user/forms/UserUpdate';
import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { getUserListContext } from '@/components/admin/user/UserListPage';
import { UserOrganizationFilter } from '@/components/admin/user/UserOrganizationFilter';
import { PortalContext } from '@/components/me/AppPortalContext';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import {
  handleSortingChange,
  mapToSortingTableValue,
  transformSortingValueToParams,
} from '@/components/ui/handle-sorting.utils';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { SearchInput } from '@/components/ui/SearchInput';
import useAdminPath from '@/hooks/use-admin-path';
import { useExecuteAfterAnimation } from '@/hooks/use-execute-after-animation';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useUsersList } from '@/hooks/use-users-list';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { i18nKey } from '@/utils/datatable';
import { useDateFormatter } from '@/utils/date';
import { MoreVertIcon } from '@filigran/icon';
import { Badge, DataTable, DataTableHeadBarOptions } from '@filigran/ui';
import {
  UserList_fragment$data,
  UserList_fragment$key,
} from '@generated/UserList_fragment.graphql';
import { UserListQuery$variables } from '@generated/UserListQuery.graphql';
import { ColumnDef, Row } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { graphql, readInlineData, useSubscription } from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';

// Configuration or Preloader Query
export const UserListQuery = graphql`
  query UserListQuery(
    $count: Int!
    $cursor: ID
    $orderBy: UserOrdering!
    $orderMode: OrderingMode!
    $filters: [Filter!]
    $searchTerm: String
  ) {
    ...UserList_users
  }
`;

export const userListFragment = graphql`
  fragment UserList_users on Query
  @refetchable(queryName: "UsersPaginationQuery") {
    users(
      first: $count
      after: $cursor
      orderBy: $orderBy
      orderMode: $orderMode
      searchTerm: $searchTerm
      filters: $filters
    ) {
      __id
      totalCount
      edges {
        node {
          ...UserList_fragment
        }
      }
    }
  }
`;

export const UserFragment = graphql`
  fragment UserList_fragment on User @inline {
    id
    email
    last_name
    first_name
    disabled
    last_login
    country
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
  const t = useTranslations();
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
  const { me } = useContext(PortalContext);
  const [userEdit, setUserEdit] = useState<UserList_fragment$data | undefined>(
    undefined
  );
  const [userToDelete, setUserToDelete] = useState<
    UserList_fragment$data | undefined
  >(undefined);

  const [filter, setFilter] = useState<{
    search?: string;
    organization?: string;
  }>({
    search: undefined,
    organization: isAdminPath ? organizationFilter : organization,
  });

  const { data, refetch } = useUsersList({
    pageSize,
    orderMode,
    orderBy,
    filter,
    fetchPolicy: 'store-and-network',
  });

  const connectionID = data?.users?.__id;
  const { setConnectionId } = getUserListContext();
  setConnectionId(connectionID);

  const userListSubscription = graphql`
    subscription UserListSubscription(
      $connections: [ID!]!
      $organizationId: ID
    ) {
      User(organizationId: $organizationId) {
        add @appendNode(connections: $connections, edgeTypeName: "UserEdge") {
          ...UserList_fragment
        }
      }
    }
  `;

  const userListSubscriptionConfig = useMemo(
    () => ({
      variables: {
        connections: [connectionID],
        organizationId: isAdminPath ? undefined : organization,
      },
      subscription: userListSubscription,
    }),
    [connectionID, isAdminPath, organization, userListSubscription]
  );
  useSubscription(userListSubscriptionConfig);

  const columns: ColumnDef<UserList_fragment$data>[] = useMemo(
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
              cell: ({ row }: { row: Row<UserList_fragment$data> }) => {
                return (
                  <div className="flex gap-xs">
                    {row.original.organization_capabilities?.map(
                      ({ id, organization: { name, personal_space } }) =>
                        !personal_space ? <Badge key={id}>{name}</Badge> : null
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
                row: { original: UserList_fragment$data };
              }) => {
                return (
                  <div className="flex gap-xs">
                    <Badge variant={disabled ? 'destructive' : 'secondary'}>
                      {t(disabled ? 'Badge.Disabled' : 'Badge.Enabled')}
                    </Badge>
                  </div>
                );
              },
            },
            {
              accessorKey: 'last_login',
              id: 'last_login',
              header: t('UserListPage.LastLogin'),
              cell: ({
                row,
              }: {
                row: { original: UserList_fragment$data };
              }) => {
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
              cell: ({
                row,
              }: {
                row: { original: UserList_fragment$data };
              }) => {
                // As non-admin path, we should return only one organization
                if (row.original.organization_capabilities) {
                  const capabilities = (
                    row.original.organization_capabilities.find(
                      ({ organization }) =>
                        organization.id === me?.selected_organization_id
                    )?.capabilities ?? []
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
      ...(hasActionsColumn
        ? [
            {
              id: 'actions',
              size: 100,
              enableHiding: false,
              enableSorting: false,
              enableResizing: false,
              cell: ({ row }: { row: Row<UserList_fragment$data> }) => {
                const canDelete = canDeleteUserRow(row.original.id, me?.id);
                return (
                  <div
                    className="flex items-center justify-end"
                    onClick={(event) => event.stopPropagation()}>
                    <IconActions
                      icon={
                        <>
                          <MoreVertIcon className="h-4 w-4 text-primary" />
                          <span className="sr-only">{t('Utils.OpenMenu')}</span>
                        </>
                      }>
                      <IconActionsItem
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
      isAdminPath,
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

  const userData = data.users.edges.map(({ node }) =>
    readInlineData<UserList_fragment$key>(UserFragment, node)
  );

  const handleRefetchData = (args?: Partial<UserListQuery$variables>) => {
    const sorting = mapToSortingTableValue(orderBy, orderMode);
    refetch({
      count: pagination.pageSize,
      cursor,
      orderBy,
      orderMode,
      ...transformSortingValueToParams(sorting),
      ...args,
    });
  };

  const { pagination, cursor, setPagination, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
      onPaginationChange: (nextPagination, nextCursor) => {
        handleRefetchData({
          count: nextPagination.pageSize,
          cursor: nextCursor,
        });
      },
    });

  const onSortingChange = (updater: unknown) => {
    handleSortingChange({
      updater,
      removeOrder,
      setOrderBy,
      setOrderMode,
      orderBy,
      orderMode,
      handleRefetchData,
    });
  };

  const handleInputChange = (inputValue: string) => {
    setFilter((prevFilter) => ({ ...prevFilter, search: inputValue }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    handleRefetchData({ searchTerm: inputValue, cursor: btoa(String(0)) });
  };

  const handleOrganizationChange = (organizationId: string | undefined) => {
    setOrganizationFilter(organizationId);
    setFilter((prevFilter) => ({
      ...prevFilter,
      organization: organizationId,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    handleRefetchData({
      filters: organizationId
        ? [{ key: 'organization_id', value: [organizationId] }]
        : undefined,
      cursor: btoa(String(0)),
    });
  };

  const debounceHandleInput = useDebounceCallback(
    (e) => handleInputChange(e.target.value),
    DEBOUNCE_TIME
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={userData}
        i18nKey={i18nKey(t)}
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange: onSortingChange,
          onPaginationChange: onPaginationChange,
          onColumnOrderChange: setColumnOrder,
          onColumnVisibilityChange: setColumnVisibility,
          manualSorting: true,
          manualPagination: true,
          rowCount: data.users.totalCount,
          enableRowSelection: (row) => row.original.id !== me!.id,
        }}
        onClickRow={(row) => setUserEdit(row.original)}
        toolbar={
          <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
            <div className="flex w-full items-center gap-s sm:w-auto">
              <SearchInput
                containerClass="w-full sm:w-auto"
                placeholder={t('UserActions.SearchUser')}
                onChange={debounceHandleInput}
              />
              {isAdminPath && (
                <UserOrganizationFilter
                  value={filter.organization}
                  onChange={handleOrganizationChange}
                />
              )}
            </div>
            <div className="flex w-full items-center justify-between gap-s sm:w-auto">
              <DataTableHeadBarOptions />
            </div>
          </div>
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
      {data.users.totalCount === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('UserListPage.NoUsers')}
        </p>
      )}
      {userEdit && (
        <EditUser
          user={userEdit}
          key={userEdit?.id}
          defaultStateOpen={!!userEdit}
          onCloseSheet={() =>
            useExecuteAfterAnimation(() => setUserEdit(undefined))
          }
        />
      )}
      {userToDelete && (
        <DeleteUser
          key={userToDelete.id}
          user={userToDelete}
          onUserDeleted={() => refetch({}, { fetchPolicy: 'network-only' })}
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
