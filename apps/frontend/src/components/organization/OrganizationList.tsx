'use client';
import { OrganizationOrdering } from '@graphql/generated';

import { CreateOrganization } from '@/components/organization/CreateOrganization';
import { DeleteOrganization } from '@/components/organization/DeleteOrganization';
import { EditOrganization } from '@/components/organization/EditOrganization';
import { getOrganizations } from '@/components/organization/Organization.service';
import { useOrganizationListLocalstorage } from '@/components/organization/organization-list-localstorage';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
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
import { MoreVertIcon } from '@filigran/icon';
import { Badge, DataTable, DataTableHeadBarOptions } from '@filigran/ui';
import { OrganizationsPaginationQuery$variables } from '@generated/OrganizationsPaginationQuery.graphql';
import { organizationItem_fragment$data } from '@generated/organizationItem_fragment.graphql';
import { ColumnDef } from '@tanstack/react-table';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';
const OrganizationList = () => {
  const t = useTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const [editOrganization, setEditOrganization] = useState<
    organizationItem_fragment$data | undefined
  >(undefined);
  const [deleteOrganization, setDeleteOrganization] = useState<
    organizationItem_fragment$data | undefined
  >(undefined);
  const columns = useMemo<ColumnDef<organizationItem_fragment$data>[]>(
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
            <div className="flex space-x-s">
              {row.original.domains?.map((domain) => (
                <Badge
                  className="truncate"
                  key={domain}>
                  {domain}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: 'actions',
        size: 100,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <IconActions
              icon={
                <>
                  <MoreVertIcon className="h-4 w-4 text-primary" />
                  <span className="sr-only">{t('Utils.OpenMenu')}</span>
                </>
              }>
              <IconActionsItem
                onClick={() => {
                  router.push(
                    `${pathname}/${encodeURIComponent(row.original.id)}/subscribed-services`
                  );
                }}>
                {t('Service.SubscribedServices')}
              </IconActionsItem>
              <IconActionsItem
                onClick={() => setEditOrganization(row.original)}>
                {t('Utils.Update')}
              </IconActionsItem>
              <IconActionsItem
                onClick={() => setDeleteOrganization(row.original)}>
                {t('Utils.Delete')}
              </IconActionsItem>
            </IconActions>
          </div>
        ),
      },
    ],
    [pathname, router, t]
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

  const { organizationsData, refetch } = getOrganizations({
    count: pageSize,
    orderMode,
    orderBy,
  });
  const organizationDataTable = organizationsData.organizations.edges.map(
    ({ node }) => node
  ) as organizationItem_fragment$data[];

  const handleRefetchData = (
    args?: Partial<OrganizationsPaginationQuery$variables>
  ) => {
    const sorting = mapToSortingTableValue(orderBy, orderMode);
    refetch({
      count: pagination.pageSize,
      cursor,
      orderBy,
      orderMode,
      searchTerm: undefined,
      ...transformSortingValueToParams(sorting),
      ...args,
    });
  };

  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      handleRefetchData({ count: nextPagination.pageSize, cursor: nextCursor });
    },
  });

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<OrganizationOrdering>({
      updater,
      orderBy,
      orderMode,
      setOrderMode,
      setOrderBy,
      removeOrder,
      handleRefetchData,
    });
  };

  const handleInputChange = (inputValue: string) => {
    handleRefetchData({ searchTerm: inputValue });
  };

  const debounceHandleInput = useDebounceCallback(
    (e) => handleInputChange(e.target.value),
    DEBOUNCE_TIME
  );

  return (
    <>
      <Suspense
        fallback={
          <DataTable
            i18nKey={i18nKey(t)}
            data={[]}
            columns={columns}
            isLoading={true}
          />
        }>
        <DataTable
          columns={columns}
          data={organizationDataTable}
          toolbar={
            <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
              <label
                htmlFor="organization-email"
                className="sr-only">
                {t('OrganizationActions.SearchOrganizationWithEmail')}
              </label>
              <SearchInput
                id="organization-email"
                containerClass="w-full sm:w-1/3"
                placeholder={t(
                  'OrganizationActions.SearchOrganizationWithEmail'
                )}
                onChange={debounceHandleInput}
              />
              <div className="flex w-full items-center justify-between gap-s sm:w-auto">
                <DataTableHeadBarOptions />
                <CreateOrganization
                  connectionId={organizationsData.organizations.__id}
                />
              </div>
            </div>
          }
          onResetTable={resetAll}
          tableOptions={{
            onSortingChange: onSortingChange,
            onPaginationChange: onPaginationChange,
            manualSorting: true,
            manualPagination: true,
            onColumnOrderChange: setColumnOrder,
            onColumnVisibilityChange: setColumnVisibility,
            rowCount: organizationsData.organizations.totalCount,
          }}
          i18nKey={i18nKey(t)}
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
      </Suspense>
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
          connectionId={organizationsData.organizations.__id}
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
