import { AddUser } from '@/components/admin/user/forms/AddUser';
import { PendingUserAlreadyProcessedDialog } from '@/components/admin/user/pending-user/PendingUserAlreadyProcessedDialog';
import { PendingUserConfirmDialog } from '@/components/admin/user/pending-user/PendingUserConfirmDialog';
import { useUserListLocalstorage } from '@/components/admin/user/pending-user/pending-user-list-localstorage';
import { PendingUser } from '@/components/admin/user/pending-user/pending-user-list.types';
import { usePendingUserActions } from '@/components/admin/user/pending-user/use-pending-user-actions';
import { usePendingUserDialog } from '@/components/admin/user/pending-user/use-pending-user-dialog';
import { PortalContext } from '@/components/me/AppPortalContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
  SelectionState,
  useRowSelection,
} from '@/components/ui/data-table';
import {
  handleSortingChange,
  mapToSortingTableValue,
} from '@/components/ui/handle-sorting.utils';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useGraphqlSubscription } from '@/hooks/use-graphql-subscription';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { IconButton, SearchField } from '@filigran/design-system';
import { CheckIcon, CloseIcon } from '@filigran/icon';
import {
  FilterKey,
  PendingUserEventsDocument,
  PendingUserEventsSubscription,
  PendingUserEventsSubscriptionVariables,
  PendingUsersQueryVariables,
  usePendingUsersQuery,
} from '@graphql/generated';
import { pendingUsersKeys } from '@graphql/user/users.keys';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

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

  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
    });

  const variables = useMemo<PendingUsersQueryVariables>(
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

  const { data, isLoading } = usePendingUsersQuery(
    portalGraphqlClient,
    variables,
    {
      // A page, sort or search change keeps the current rows until its results arrive.
      placeholderData: keepPreviousData,
      // Like Relay, a failed load reaches the error page; a failed background
      // refetch keeps the rows shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );

  const userData = useMemo<PendingUser[] | undefined>(
    () => data?.pendingUsers.edges.map(({ node }) => node),
    [data]
  );

  const [selection, setSelection] = useState<SelectionState>({
    selectAll: false,
    selectedIds: new Set<string>(),
    excludedIds: new Set<string>(),
  });
  const { clearSelection } = useRowSelection(selection, setSelection);

  const queryClient = useQueryClient();
  // Only the list on screen, as the Relay refetch did: the bell and the tab
  // counter keep their own pending users query.
  const refreshPendingUsers = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: pendingUsersKeys.list(variables),
      exact: true,
    });
  }, [queryClient, variables]);

  useGraphqlSubscription<
    PendingUserEventsSubscription,
    PendingUserEventsSubscriptionVariables
  >(
    PendingUserEventsDocument,
    { organizationId: organization },
    {
      onNext: ({ UserPending }) => {
        // invalidate is left to the bell, as before.
        if (UserPending?.delete) {
          refreshPendingUsers();
        }
      },
    }
  );

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

  const columns: ColumnDef<PendingUser>[] = useMemo(
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
              <IconButton
                variant="destructive"
                priority="tertiary"
                className="border"
                {...analyticsId('organization_join_request_delete')}
                aria-label={t('PendingUserListPage.Reject')}
                icon={<CloseIcon className="h-4 w-4" />}
                onClick={() => openRejectDialog(row.original)}
              />
              <IconButton
                priority="tertiary"
                className="border"
                {...analyticsId('organization_join_request_confirm')}
                aria-label={t('PendingUserListPage.Approve')}
                icon={<CheckIcon className="h-4 w-4" />}
                onClick={() => openApproveDialog(row.original)}
              />
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

  const searchHandlers = useDebouncedSearch({
    apply: handleInputChange,
    appliedTerm: filter.search,
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={userData ?? []}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
        onResetTable={resetAll}
        selectionOptions={{
          selectionState: {
            state: selection,
            onSelectionChange: setSelection,
          },
          selectionHeader: {
            actions: ({ selectionState }) => (
              <>
                <ConfirmDialog
                  confirmAnalyticsId="organization_join_requests_rejection_confirm"
                  title={t('PendingUserListPage.WarningUsersRejection.Title')}
                  confirmLabel={t(
                    'PendingUserListPage.WarningUsersRejection.Confirm'
                  )}
                  trigger={
                    <IconButton
                      variant="destructive"
                      priority="tertiary"
                      className="border"
                      {...analyticsId('organization_join_requests_delete')}
                      aria-label={t('PendingUserListPage.Reject')}
                      icon={<CloseIcon className="h-4 w-4" />}
                    />
                  }
                  onConfirm={() => handleBulkReject(selectionState)}>
                  {t('PendingUserListPage.WarningUsersRejection.Description')}
                </ConfirmDialog>
                <ConfirmDialog
                  confirmAnalyticsId="organization_join_requests_approval_confirm"
                  title={t('PendingUserListPage.WarningUsersAccept.Title')}
                  confirmLabel={t(
                    'PendingUserListPage.WarningUsersAccept.Confirm'
                  )}
                  trigger={
                    <IconButton
                      priority="tertiary"
                      className="border"
                      {...analyticsId('organization_join_requests_confirm')}
                      aria-label={t('PendingUserListPage.Approve')}
                      icon={<CheckIcon className="h-4 w-4" />}
                    />
                  }
                  onConfirm={() => handleBulkApprove(selectionState)}>
                  {t.rich(
                    'PendingUserListPage.WarningUsersAccept.Description',
                    {
                      strong: renderStrong,
                    }
                  )}
                </ConfirmDialog>
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
          rowCount: data?.pendingUsers.totalCount ?? 0,
          enableRowSelection: (row) => row.original.id !== me!.id,
        }}
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
            actions={
              <>
                <DataTableHeadBarOptions />
                <AddUser />
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
