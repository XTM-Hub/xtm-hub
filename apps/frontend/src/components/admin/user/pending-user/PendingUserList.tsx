import { UserFragment } from '@/components/admin/user/UserList';
import { PendingUserAlreadyProcessedDialog } from '@/components/admin/user/pending-user/PendingUserAlreadyProcessedDialog';
import { PendingUserConfirmDialog } from '@/components/admin/user/pending-user/PendingUserConfirmDialog';
import { useUserListLocalstorage } from '@/components/admin/user/pending-user/pending-user-list-localstorage';
import { usePendingUserActions } from '@/components/admin/user/pending-user/use-pending-user-actions';
import { usePendingUserDialog } from '@/components/admin/user/pending-user/use-pending-user-dialog';
import {
  UserPendingListFragment,
  UserPendingListQuery,
  UserPendingListSubscription,
} from '@/components/admin/user/user.graphql';
import { PortalContext } from '@/components/me/AppPortalContext';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  handleSortingChange,
  mapToSortingTableValue,
  transformSortingValueToParams,
} from '@/components/ui/handle-sorting.utils';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { i18nKey } from '@/utils/datatable';
import { CheckIcon, CloseIcon } from '@filigran/icon';
import {
  DataTable,
  DataTableHeadBarOptions,
  SelectionState,
  useRowSelection,
} from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
import {
  UserList_fragment$data,
  UserList_fragment$key,
} from '@generated/UserList_fragment.graphql';
import {
  userPendingListQuery,
  userPendingListQuery$variables,
} from '@generated/userPendingListQuery.graphql';
import { userPendingList_users$key } from '@generated/userPendingList_users.graphql';
import { FilterKey } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  readInlineData,
  useLazyLoadQuery,
  useRefetchableFragment,
  useSubscription,
} from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';

const renderStrong = (chunks: ReactNode) => <strong>{chunks}</strong>;

interface PendingUserListProps {
  organization: string;
}

const PendingUserList = ({ organization }: PendingUserListProps) => {
  const t = useTranslate();
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
    resetAll,
    removeOrder,
  } = useUserListLocalstorage();
  const { me } = useContext(PortalContext);

  const [filter, setFilter] = useState<{
    search?: string;
    organization?: string;
  }>({
    search: undefined,
    organization,
  });

  const queryData = useLazyLoadQuery<userPendingListQuery>(
    UserPendingListQuery,
    {
      count: pageSize,
      orderMode: orderMode,
      orderBy: orderBy,
      searchTerm: filter.search,
      filters: filter.organization
        ? [{ key: FilterKey.OrganizationId, value: [filter.organization] }]
        : undefined,
    }
  );

  const [data, refetch] = useRefetchableFragment<
    userPendingListQuery,
    userPendingList_users$key
  >(UserPendingListFragment, queryData);

  const userData = useMemo<UserList_fragment$data[]>(
    () =>
      data.pendingUsers.edges.map(({ node }) =>
        readInlineData<UserList_fragment$key>(UserFragment, node)
      ),
    [data]
  );

  const [selection, setSelection] = useState<SelectionState>({
    selectAll: false,
    selectedIds: new Set<string>(),
    excludedIds: new Set<string>(),
  });
  const { clearSelection } = useRowSelection(selection, setSelection);

  const refreshPendingUsers = useCallback(() => {
    refetch({}, { fetchPolicy: 'network-only' });
  }, [refetch]);

  const connectionID = data?.pendingUsers?.__id;
  const pendingUserListSubscriptionConfig = useMemo(
    () => ({
      variables: {
        connections: [connectionID],
        organizationId: organization,
      },
      subscription: UserPendingListSubscription,
    }),
    [connectionID, organization]
  );
  useSubscription(pendingUserListSubscriptionConfig);

  const handleBulkMutationCompletion = useCallback(() => {
    clearSelection();
    refreshPendingUsers();
  }, [clearSelection, refreshPendingUsers]);

  const { approveUser, rejectUser, handleBulkApprove, handleBulkReject } =
    usePendingUserActions({
      organization,
      selectedOrganizationId: me!.selected_organization_id,
      searchTerm: filter.search,
      onAfterSingleMutation: refreshPendingUsers,
      onAfterBulkMutation: handleBulkMutationCompletion,
    });

  const {
    pendingUserDialog,
    openApproveDialog,
    openRejectDialog,
    closePendingUserDialog,
    onConfirmPendingUserAction,
    alreadyProcessedDialogOpen,
    closeAlreadyProcessedDialog,
  } = usePendingUserDialog({
    userData,
    approveUser,
    rejectUser,
  });

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
      {
        accessorKey: 'actions',
        id: 'actions',
        minSize: 40,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        header: undefined,
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="tertiary-destructive"
                size="icon"
                className="border"
                onClick={() => openRejectDialog(row.original)}>
                <CloseIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                size="icon"
                className="border"
                onClick={() => openApproveDialog(row.original)}>
                <CheckIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [openApproveDialog, openRejectDialog, t]
  );

  useEffect(() => {
    if (columnOrder.length === 0) {
      const defaultColumnOrder = columns.map((column) => column.id!);
      setColumnOrder(defaultColumnOrder);
    }
  }, [columnOrder.length, columns, setColumnOrder]);

  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      handleRefetchData({ count: nextPagination.pageSize, cursor: nextCursor });
    },
  });

  const handleRefetchData = (
    args?: Partial<userPendingListQuery$variables>
  ) => {
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
    setFilter((prevFilter) => {
      const updatedFilter = {
        ...prevFilter,
        search: inputValue,
      };
      refetch({ searchTerm: updatedFilter.search });
      return updatedFilter;
    });
  };

  const debounceHandleInput = useDebounceCallback(
    (event) => handleInputChange(event.target.value),
    DEBOUNCE_TIME
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={userData}
        i18nKey={i18nKey(t)}
        onResetTable={resetAll}
        selectionOptions={{
          selectionState: {
            state: selection,
            onSelectionChange: setSelection,
          },
          selectionHeader: {
            actions: ({ selectionState }) => (
              <>
                <AlertDialogComponent
                  AlertTitle={t(
                    'PendingUserListPage.WarningUsersRejection.Title'
                  )}
                  actionButtonText={t(
                    'PendingUserListPage.WarningUsersRejection.Confirm'
                  )}
                  triggerElement={
                    <Button
                      variant="tertiary-destructive"
                      size="icon"
                      className="border">
                      <CloseIcon className="h-4 w-4" />
                    </Button>
                  }
                  onClickContinue={() => handleBulkReject(selectionState)}>
                  {t('PendingUserListPage.WarningUsersRejection.Description')}
                </AlertDialogComponent>
                <AlertDialogComponent
                  AlertTitle={t('PendingUserListPage.WarningUsersAccept.Title')}
                  actionButtonText={t(
                    'PendingUserListPage.WarningUsersAccept.Confirm'
                  )}
                  triggerElement={
                    <Button
                      variant="tertiary"
                      size="icon"
                      className="border">
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  }
                  onClickContinue={() => handleBulkApprove(selectionState)}>
                  {t.rich(
                    'PendingUserListPage.WarningUsersAccept.Description',
                    {
                      strong: renderStrong,
                    }
                  )}
                </AlertDialogComponent>
              </>
            ),
          },
        }}
        tableOptions={{
          onSortingChange,
          onPaginationChange,
          onColumnOrderChange: setColumnOrder,
          onColumnVisibilityChange: setColumnVisibility,
          manualSorting: true,
          manualPagination: true,
          rowCount: data.pendingUsers.totalCount,
          enableRowSelection: (row) => row.original.id !== me!.id,
        }}
        toolbar={
          <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
            <SearchInput
              containerClass="w-full sm:w-1/3"
              placeholder={t('UserActions.SearchUser')}
              onChange={debounceHandleInput}
            />
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
            right: ['actions'],
          },
        }}
      />
      <PendingUserConfirmDialog
        pendingUserDialog={pendingUserDialog}
        onOpenChange={closePendingUserDialog}
        onConfirm={onConfirmPendingUserAction}
      />
      <PendingUserAlreadyProcessedDialog
        isOpen={alreadyProcessedDialogOpen}
        onOpenChange={closeAlreadyProcessedDialog}
      />
    </>
  );
};

export default PendingUserList;
