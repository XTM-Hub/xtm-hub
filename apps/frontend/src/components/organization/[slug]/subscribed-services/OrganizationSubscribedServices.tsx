'use client';

import { SearchInput } from '@/components/ui/SearchInput';
import {
  handleSortingChange,
  mapToSortingTableValue,
} from '@/components/ui/handle-sorting.utils';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { i18nKey } from '@/utils/datatable';
import { useDateFormatter } from '@/utils/date';
import { Badge, DataTable, DataTableHeadBarOptions } from '@filigran/ui';
import {
  OrderingMode,
  OrganizationSubscribedServiceRowFragment,
  SubscriptionFilterKey,
  useOrganizationSubscribedServicesListQuery,
} from '@graphql/generated';
import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { ChangeEvent, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';
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
  const t = useTranslations();
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
            <Badge variant="outline">
              {t(`Service.ServiceDefinitionIdentifier.${identifier}`)}
            </Badge>
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
          return status ? <Badge>{status}</Badge> : '—';
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
            <div className="flex gap-xs">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline">
                  {tag}
                </Badge>
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

  const onSearchChange = useDebounceCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
      setPagination((prevPagination) => ({
        ...prevPagination,
        pageIndex: 0,
      }));
    },
    DEBOUNCE_TIME
  );

  return (
    <>
      {isError && (
        <div className="mb-s text-sm text-destructive">{t('Utils.Error')}</div>
      )}
      {!isError && !isLoading && subscribedServicesData.length === 0 && (
        <div className="mb-s text-sm text-muted-foreground">
          {t('Service.SubscribedServicesList.NoSubscribedServices')}
        </div>
      )}
      <DataTable
        columns={columns}
        data={subscribedServicesData}
        isLoading={isLoading}
        i18nKey={i18nKey(t)}
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
          <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
            <label
              htmlFor="subscribed-services-search"
              className="sr-only">
              {t('Service.SearchServices')}
            </label>
            <SearchInput
              id="subscribed-services-search"
              containerClass="w-full sm:w-1/3"
              placeholder={t('Service.SearchServices')}
              onChange={onSearchChange}
            />
            <div className="flex w-full items-center justify-between gap-s sm:w-auto">
              <DataTableHeadBarOptions />
            </div>
          </div>
        }
      />
    </>
  );
};

export default OrganizationSubscribedServicesSlug;
