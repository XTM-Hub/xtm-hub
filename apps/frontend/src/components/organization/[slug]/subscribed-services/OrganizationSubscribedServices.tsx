'use client';

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
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useDateFormatter } from '@/utils/date';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { Chip, SearchField } from '@filigran/design-system';
import {
  OrderingMode,
  OrganizationSubscribedServiceRowFragment,
  SubscriptionFilterKey,
  useOrganizationSubscribedServicesListQuery,
} from '@graphql/generated';
import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import {
  normalizeSubscribedServicesPageSize,
  useOrganizationSubscribedServicesLocalstorage,
} from './organization-subscribed-services-localstorage';

interface OrganizationSubscribedServicesProps {
  organizationId: string;
}

const OrganizationSubscribedServicesSlug = ({
  organizationId,
}: OrganizationSubscribedServicesProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const [searchTerm, setSearchTerm] = useState('');
  const columns = useMemo<
    ColumnDef<OrganizationSubscribedServiceRowFragment>[]
  >(
    () => [
      {
        accessorFn: (row) => row.service_instance?.name,
        id: 'service_name',
        header: t('Service.SubscribedServicesList.ServiceName'),
        cell: ({ row }) => {
          return (
            <span className="font-medium">
              {row.original.service_instance?.name ?? '—'}
            </span>
          );
        },
      },
      {
        accessorFn: (row) =>
          row.service_instance?.service_definition?.identifier,
        id: 'service_type',
        header: t('Service.SubscribedServicesList.ServiceType'),
        enableSorting: false,
        cell: ({ row }) => {
          const identifier =
            row.original.service_instance?.service_definition?.identifier;
          return identifier ? (
            <Chip
              label={t(`Service.ServiceDefinitionIdentifier.${identifier}`)}
            />
          ) : (
            '—'
          );
        },
      },
      {
        accessorFn: (row) => row.service_instance?.creation_status,
        id: 'status',
        header: t('Service.SubscribedServicesList.Status'),
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original.service_instance?.creation_status;
          return status ? <Chip label={status} /> : '—';
        },
      },
      {
        accessorFn: (row) =>
          row.start_date ? new Date(row.start_date).getTime() : undefined,
        id: 'start_date',
        header: t('Service.SubscribedServicesList.StartDate'),
        cell: ({ row }) => {
          return row.original.start_date
            ? (formatDate(row.original.start_date) ?? '—')
            : '—';
        },
      },
      {
        accessorKey: 'service_instance.tags',
        id: 'tags',
        header: t('Service.SubscribedServicesList.Tags'),
        enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.service_instance?.tags;
          return tags?.length ? (
            <div className="flex gap-1">
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                />
              ))}
            </div>
          ) : (
            '—'
          );
        },
      },
    ],
    [t, formatDate]
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
  } = useOrganizationSubscribedServicesLocalstorage(columns);
  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
      normalizePageSize: normalizeSubscribedServicesPageSize,
    });

  const variables = {
    count: pagination.pageSize,
    after: cursor,
    orderBy,
    orderMode,
    searchTerm: searchTerm.trim() || null,
    filters: [
      {
        key: SubscriptionFilterKey.OrganizationId,
        value: [organizationId],
      },
    ],
  };

  const {
    data: queryData,
    isError,
    isLoading,
  } = useOrganizationSubscribedServicesListQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: organizationSubscribedServicesKeys.list(variables),
    }
  );

  const subscribedServicesData = useMemo<
    OrganizationSubscribedServiceRowFragment[]
  >(() => {
    const edges = queryData?.subscriptions?.edges ?? [];
    return edges.map(({ node }) => node);
  }, [queryData]);

  const onSortingChange = (updater: unknown) => {
    handleSortingChange({
      updater,
      orderBy,
      orderMode,
      setOrderMode: (nextOrderMode) =>
        setOrderMode(
          nextOrderMode === 'desc' ? OrderingMode.Desc : OrderingMode.Asc
        ),
      setOrderBy,
      removeOrder,
      handleRefetchData: () => undefined,
    });
  };

  const applySearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prevPagination) => ({
      ...prevPagination,
      pageIndex: 0,
    }));
  };

  const searchHandlers = useDebouncedSearch({
    apply: applySearch,
    appliedTerm: searchTerm,
  });

  return (
    <>
      {isError && (
        <div className="mb-2 text-sm text-feedback-error-primary">
          {t('Utils.Error')}
        </div>
      )}
      {!isError && !isLoading && subscribedServicesData.length === 0 && (
        <div className="mb-2 text-sm text-default-secondary">
          {t('Service.SubscribedServicesList.NoSubscribedServices')}
        </div>
      )}
      <DataTable
        columns={columns}
        data={subscribedServicesData}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
        onResetTable={resetAll}
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
          columnOrder,
          columnVisibility,
        }}
        tableOptions={{
          onSortingChange,
          manualSorting: true,
          onPaginationChange,
          manualPagination: true,
          onColumnOrderChange: setColumnOrder,
          onColumnVisibilityChange: setColumnVisibility,
          rowCount: queryData?.subscriptions.totalCount ?? 0,
        }}
        toolbar={
          <DataTableToolbar
            search={
              <SearchField
                fullWidth
                aria-label={t('Service.SearchServices')}
                placeholder={t('Service.SearchServices')}
                clearLabel={t('DesignSystem.SearchField.Clear')}
                onChange={searchHandlers.onChange}
                onClear={searchHandlers.onClear}
              />
            }
            actions={<DataTableHeadBarOptions />}
          />
        }
      />
    </>
  );
};

export default OrganizationSubscribedServicesSlug;
