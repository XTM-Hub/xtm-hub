'use client';
import { CreateOrganization } from '@/components/organization/CreateOrganization';
import { DeleteOrganization } from '@/components/organization/DeleteOrganization';
import { EditOrganization } from '@/components/organization/EditOrganization';
import { useOrganizationListLocalstorage } from '@/components/organization/organization-list-localstorage';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
} from '@/components/ui/data-table';
import {
  handleSortingChange,
  mapToSortingTableValue,
} from '@/components/ui/handle-sorting.utils';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { Chip, SearchField } from '@filigran/design-system';
import { MoreVertIcon } from '@filigran/icon';
import {
  OrderingMode,
  OrganizationItemFragment,
  OrganizationOrdering,
  type OrganizationsAdminListQueryVariables,
  useOrganizationsAdminListQuery,
} from '@graphql/generated';
import { adminOrganizationsKeys } from '@graphql/organization/organization.keys';
import { keepPreviousData } from '@tanstack/react-query';
import { ColumnDef, Row } from '@tanstack/react-table';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const OrganizationList = () => {
  const t = useTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const [editOrganization, setEditOrganization] = useState<
    OrganizationItemFragment | undefined
  >(undefined);
  const [deleteOrganization, setDeleteOrganization] = useState<
    OrganizationItemFragment | undefined
  >(undefined);
  const canManageOrganizations = useAdminByPass();
  const columns = useMemo<ColumnDef<OrganizationItemFragment>[]>(
    () => [
      {
        accessorKey: 'name',
        id: 'name',
        header: t('OrganizationForm.Name'),
        cell: ({ row }) => {
          return <>{row.original.name}</>;
        },
      },
      {
        accessorKey: 'domains',
        id: 'domains',
        header: t('OrganizationForm.Domains'),
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <div className="flex space-x-2">
              {row.original.domains?.map((domain) => (
                <Chip
                  key={domain}
                  label={domain}
                />
              ))}
            </div>
          );
        },
      },
      ...(canManageOrganizations
        ? [
            {
              id: 'actions',
              size: 100,
              enableHiding: false,
              enableSorting: false,
              enableResizing: false,
              cell: ({ row }: { row: Row<OrganizationItemFragment> }) => (
                <div className="flex items-center justify-end">
                  <IconActions
                    analyticsId="list_row_actions_open"
                    aria-label={t('Utils.OpenMenu')}
                    icon={
                      <MoreVertIcon className="h-4 w-4 text-icon-highlight" />
                    }>
                    <IconActionsItem
                      {...analyticsId('admin_organization_services_open')}
                      onClick={() => {
                        router.push(
                          `${pathname}/${encodeURIComponent(row.original.id)}/subscribed-services`
                        );
                      }}>
                      {t('Service.SubscribedServices')}
                    </IconActionsItem>
                    <IconActionsItem
                      {...analyticsId('admin_organization_edit')}
                      onClick={() => setEditOrganization(row.original)}>
                      {t('Utils.Update')}
                    </IconActionsItem>
                    <IconActionsItem
                      {...analyticsId('admin_organization_delete')}
                      onClick={() => setDeleteOrganization(row.original)}>
                      {t('Utils.Delete')}
                    </IconActionsItem>
                  </IconActions>
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManageOrganizations, pathname, router, t]
  );
  const {
    pageSize,
    setPageSize,
    orderMode,
    setOrderMode,
    orderBy,
    setOrderBy,
    removeOrder,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    resetAll,
  } = useOrganizationListLocalstorage(columns);

  const [searchTerm, setSearchTerm] = useState('');

  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
    });

  const variables: OrganizationsAdminListQueryVariables = {
    count: pagination.pageSize,
    cursor,
    orderMode,
    orderBy,
    searchTerm,
  };
  // Keeps the previous result while other variables load: isPlaceholderData flags it as stale.
  const { data, isLoading, isError, isPlaceholderData } =
    useOrganizationsAdminListQuery(portalGraphqlClient, variables, {
      queryKey: adminOrganizationsKeys.list(variables),
      placeholderData: keepPreviousData,
    });

  const organizations = useMemo<OrganizationItemFragment[]>(
    () => (data?.organizations.edges ?? []).map(({ node }) => node),
    [data]
  );
  const totalCount = data?.organizations.totalCount ?? 0;

  // Deleting the last row of the last page leaves it empty once the list is fetched again.
  useEffect(() => {
    if (
      !isLoading &&
      !isError &&
      !isPlaceholderData &&
      organizations.length === 0 &&
      pagination.pageIndex > 0
    ) {
      setPagination((previousPagination) => ({
        ...previousPagination,
        pageIndex: previousPagination.pageIndex - 1,
      }));
    }
  }, [
    isLoading,
    isError,
    isPlaceholderData,
    organizations.length,
    pagination.pageIndex,
    setPagination,
  ]);

  const resetToFirstPage = () =>
    setPagination((previousPagination) => ({
      ...previousPagination,
      pageIndex: 0,
    }));

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<OrganizationOrdering, OrderingMode>({
      updater,
      orderBy,
      orderMode,
      setOrderMode,
      setOrderBy,
      removeOrder,
      handleRefetchData: resetToFirstPage,
    });
  };

  const searchHandlers = useDebouncedSearch({
    apply: (term) => {
      setSearchTerm(term);
      resetToFirstPage();
    },
    appliedTerm: searchTerm,
  });

  return (
    <>
      {isError && (
        <div className="mb-2 text-sm text-feedback-error-primary">
          {t('OrganizationActions.LoadOrganizationsError')}
        </div>
      )}
      <DataTable
        columns={columns}
        data={organizations}
        // Skeletons replace the previous rows while another page, sort or search loads.
        isLoading={isLoading || isPlaceholderData}
        toolbar={
          <DataTableToolbar
            search={
              <SearchField
                fullWidth
                aria-label={t(
                  'OrganizationActions.SearchOrganizationWithEmail'
                )}
                placeholder={t(
                  'OrganizationActions.SearchOrganizationWithEmail'
                )}
                clearLabel={t('DesignSystem.SearchField.Clear')}
                onChange={searchHandlers.onChange}
                onClear={searchHandlers.onClear}
              />
            }
            actions={
              <>
                <DataTableHeadBarOptions />
                {canManageOrganizations && <CreateOrganization />}
              </>
            }
          />
        }
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange: onSortingChange,
          onPaginationChange: onPaginationChange,
          manualSorting: true,
          manualPagination: true,
          onColumnOrderChange: setColumnOrder,
          onColumnVisibilityChange: setColumnVisibility,
          rowCount: totalCount,
        }}
        {...getDataTableLabels(t)}
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
          columnOrder,
          columnVisibility,
          columnPinning: {
            right: canManageOrganizations ? ['actions'] : [],
          },
        }}
      />
      {editOrganization && (
        <EditOrganization
          key={`edit-${editOrganization.id}`}
          organization={editOrganization}
          open={!!editOrganization}
          setOpen={(open) =>
            setEditOrganization(open ? editOrganization : undefined)
          }
        />
      )}
      {deleteOrganization && (
        <DeleteOrganization
          key={`delete-${deleteOrganization.id}`}
          organization={deleteOrganization}
          open={!!deleteOrganization}
          setOpen={(open) =>
            setDeleteOrganization(open ? deleteOrganization : undefined)
          }
        />
      )}
    </>
  );
};
export default OrganizationList;
