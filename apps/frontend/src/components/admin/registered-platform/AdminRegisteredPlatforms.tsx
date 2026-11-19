'use client';

import { useAdminRegisteredPlatformsLocalstorage } from '@/components/admin/registered-platform/admin-registered-platforms-localstorage';
import {
  type AdminRegisteredPlatformRow,
  type AdminRegisteredPlatformsFilters,
  ALL_FILTER_VALUE,
  buildAdminRegisteredPlatformsVariables,
  canUnregisterPlatform,
  EMPTY_ADMIN_REGISTERED_PLATFORMS_FILTERS,
  getCommercialModelLabelKey,
  getContractLabelKey,
  getCredentialKindLabelKey,
  getPlatformProductName,
  getRegistererName,
  getStatusLabelKey,
  isHttpUrl,
  normalizeAdminRegisteredPlatformsPageSize,
  parseIdentifierFilterValue,
  parseStatusFilterValue,
  toAdminRegisteredPlatformRows,
  translateOrRaw,
} from '@/components/admin/registered-platform/admin-registered-platforms.utils';
import { AdminRegisteredPlatformsSelectFilter } from '@/components/admin/registered-platform/AdminRegisteredPlatformsSelectFilter';
import { AdminUnregisterPlatform } from '@/components/admin/registered-platform/AdminUnregisterPlatform';
import { UserOrganizationFilter } from '@/components/admin/user/UserOrganizationFilter';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
} from '@/components/ui/data-table';
import {
  handleSortingChange,
  mapToSortingTableValue,
} from '@/components/ui/handle-sorting.utils';
import { TruncatedText } from '@/components/ui/truncated-text';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { useDateFormatter } from '@/utils/date';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { Chip, SearchField, TooltipProvider } from '@filigran/design-system';
import { adminRegisteredPlatformsKeys } from '@graphql/admin-registered-platforms/admin-registered-platforms.keys';
import {
  AdminRegisteredPlatformOrdering,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformIdentifier,
  useAdminRegisteredPlatformsQuery,
} from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { ChangeEvent, ReactNode, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

const SecondaryText = ({ children }: { children: ReactNode }) => (
  <span className="block truncate text-sm text-default-secondary">
    {children}
  </span>
);

export const AdminRegisteredPlatforms = () => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const [filters, setFilters] = useState<AdminRegisteredPlatformsFilters>(
    EMPTY_ADMIN_REGISTERED_PLATFORMS_FILTERS
  );

  const {
    orderBy,
    setOrderBy,
    orderMode,
    setOrderMode,
    pageSize,
    setPageSize,
    removeOrder,
    resetAll,
  } = useAdminRegisteredPlatformsLocalstorage();

  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
      normalizePageSize: normalizeAdminRegisteredPlatformsPageSize,
    });

  const variables = useMemo(
    () =>
      buildAdminRegisteredPlatformsVariables({
        filters,
        pageSize: pagination.pageSize,
        cursor,
        orderBy,
        orderMode,
      }),
    [filters, pagination.pageSize, cursor, orderBy, orderMode]
  );

  const { data, isLoading } = useAdminRegisteredPlatformsQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: adminRegisteredPlatformsKeys.list(variables),
      placeholderData: keepPreviousData,
      // A failed load reaches the admin error page; a failed background refetch keeps the rows shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );

  const platforms = useMemo(() => toAdminRegisteredPlatformRows(data), [data]);

  const resetToFirstPage = () =>
    setPagination((previousPagination) => ({
      ...previousPagination,
      pageIndex: 0,
    }));

  const updateFilters = (
    nextFilters: Partial<AdminRegisteredPlatformsFilters>
  ) => {
    setFilters((previousFilters) => ({ ...previousFilters, ...nextFilters }));
    resetToFirstPage();
  };

  const onSearchChange = useDebounceCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      updateFilters({ searchTerm: event.target.value.trim() || null }),
    DEBOUNCE_TIME
  );

  const onSearchClear = () => {
    onSearchChange.cancel();
    updateFilters({ searchTerm: null });
  };

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<AdminRegisteredPlatformOrdering, OrderingMode>({
      updater,
      orderBy,
      orderMode,
      setOrderBy,
      setOrderMode,
      removeOrder,
      handleRefetchData: resetToFirstPage,
    });
  };

  const columns: ColumnDef<AdminRegisteredPlatformRow>[] = [
    {
      id: AdminRegisteredPlatformOrdering.Title,
      accessorFn: (platform) => platform.title,
      sortDescFirst: false,
      header: t('AdminRegisteredPlatforms.Columns.Platform'),
      size: 220,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <TruncatedText text={row.original.title} />
          {isHttpUrl(row.original.url) ? (
            <a
              {...analyticsId('admin_registered_platform_url_open')}
              href={row.original.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm text-filigran-brand-primary underline">
              {row.original.url}
            </a>
          ) : (
            <SecondaryText>{row.original.url}</SecondaryText>
          )}
        </div>
      ),
    },
    {
      id: 'product',
      header: t('AdminRegisteredPlatforms.Columns.Product'),
      size: 120,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">
            {getPlatformProductName(row.original.identifier)}
          </span>
          {row.original.version && (
            <SecondaryText>{row.original.version}</SecondaryText>
          )}
        </div>
      ),
    },
    {
      id: AdminRegisteredPlatformOrdering.OrganizationName,
      accessorFn: (platform) => platform.organization?.name,
      sortDescFirst: false,
      header: t('AdminRegisteredPlatforms.Columns.Organization'),
      size: 160,
      cell: ({ row }) =>
        row.original.organization && (
          <TruncatedText text={row.original.organization.name} />
        ),
    },
    {
      id: 'tenant',
      header: t('AdminRegisteredPlatforms.Columns.Tenant'),
      size: 140,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.tenant_name && (
          <TruncatedText text={row.original.tenant_name} />
        ),
    },
    {
      id: 'contract',
      header: t('AdminRegisteredPlatforms.Columns.Contract'),
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">
            {translateOrRaw(
              t,
              getContractLabelKey(row.original.contract),
              row.original.contract
            )}
          </span>
          <SecondaryText>
            {translateOrRaw(
              t,
              getCommercialModelLabelKey(row.original.commercial_model),
              row.original.commercial_model
            )}
          </SecondaryText>
        </div>
      ),
    },
    {
      id: 'status',
      header: t('AdminRegisteredPlatforms.Columns.Status'),
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <Chip
          label={translateOrRaw(
            t,
            getStatusLabelKey(row.original.status),
            row.original.status
          )}
        />
      ),
    },
    {
      id: AdminRegisteredPlatformOrdering.LastConnectivityCheck,
      accessorFn: (platform) => platform.last_connectivity_check,
      header: t('AdminRegisteredPlatforms.Columns.LastConnectivityCheck'),
      size: 150,
      cell: ({ row }) => (
        <span className="truncate">
          {formatDate(row.original.last_connectivity_check, 'DATETIME_NUMERIC')}
        </span>
      ),
    },
    {
      id: 'registerer',
      header: t('AdminRegisteredPlatforms.Columns.Registerer'),
      size: 180,
      enableSorting: false,
      cell: ({ row }) => {
        const { registerer } = row.original;
        if (!registerer) {
          return null;
        }
        const registererName = getRegistererName(registerer);
        return (
          <TruncatedText
            text={registerer.email}
            details={
              registererName && (
                <span className="text-default-secondary">{registererName}</span>
              )
            }
          />
        );
      },
    },
    {
      id: 'credential',
      header: t('AdminRegisteredPlatforms.Columns.Credential'),
      size: 130,
      enableSorting: false,
      cell: ({ row }) => {
        const { kind, has_token } = row.original.credential;
        return (
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <Chip
              label={translateOrRaw(t, getCredentialKindLabelKey(kind), kind)}
            />
            <SecondaryText>
              {has_token
                ? t('AdminRegisteredPlatforms.Credential.TokenStored')
                : t('AdminRegisteredPlatforms.Credential.NoTokenStored')}
            </SecondaryText>
          </div>
        );
      },
    },
    {
      id: 'identifiers',
      header: t('AdminRegisteredPlatforms.Columns.Identifiers'),
      size: 220,
      enableSorting: false,
      cell: ({ row }) => (
        <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-1 text-sm">
          <dt className="text-default-secondary">
            {t('AdminRegisteredPlatforms.Identifiers.ServiceInstance')}
          </dt>
          <dd className="min-w-0">
            <TruncatedText text={row.original.service_instance_id} />
          </dd>
          <dt className="text-default-secondary">
            {t('AdminRegisteredPlatforms.Identifiers.Platform')}
          </dt>
          <dd className="min-w-0">
            <TruncatedText text={row.original.platform_id} />
          </dd>
          {row.original.tenant_id && (
            <>
              <dt className="text-default-secondary">
                {t('AdminRegisteredPlatforms.Identifiers.Tenant')}
              </dt>
              <dd className="min-w-0">
                <TruncatedText text={row.original.tenant_id} />
              </dd>
            </>
          )}
        </dl>
      ),
    },
    {
      id: 'actions',
      size: 120,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) =>
        canUnregisterPlatform(row.original) && (
          <div className="flex justify-end">
            <AdminUnregisterPlatform platform={row.original} />
          </div>
        ),
    },
  ];

  const productOptions = Object.values(PlatformIdentifier).map(
    (identifier) => ({
      value: identifier,
      label: getPlatformProductName(identifier),
    })
  );
  const statusOptions = Object.values(PlatformConfigurationStatus).map(
    (status) => ({
      value: status,
      label: translateOrRaw(t, getStatusLabelKey(status), status),
    })
  );

  return (
    // One provider for every tooltip of the table, rather than one per cell.
    <TooltipProvider>
      <DataTable
        columns={columns}
        data={platforms}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange,
          onPaginationChange,
          manualSorting: true,
          manualPagination: true,
          rowCount: data?.adminRegisteredPlatforms.totalCount ?? 0,
        }}
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
          columnPinning: { right: ['actions'] },
        }}
        toolbar={
          <DataTableToolbar
            search={
              <>
                <label
                  htmlFor="admin-registered-platforms-search"
                  className="sr-only">
                  {t('AdminRegisteredPlatforms.Search')}
                </label>
                <SearchField
                  id="admin-registered-platforms-search"
                  fullWidth
                  placeholder={t('AdminRegisteredPlatforms.Search')}
                  clearLabel={t('AdminRegisteredPlatforms.ClearSearch')}
                  onChange={onSearchChange}
                  onClear={onSearchClear}
                />
              </>
            }
            filters={
              <>
                <AdminRegisteredPlatformsSelectFilter
                  label={t('AdminRegisteredPlatforms.Filters.Product')}
                  allLabel={t('AdminRegisteredPlatforms.Filters.AllProducts')}
                  value={filters.identifier ?? ALL_FILTER_VALUE}
                  options={productOptions}
                  onValueChange={(value) =>
                    updateFilters({
                      identifier: parseIdentifierFilterValue(value),
                    })
                  }
                  triggerAnalyticsId="admin_registered_platform_products_open"
                />
                <AdminRegisteredPlatformsSelectFilter
                  label={t('AdminRegisteredPlatforms.Filters.Status')}
                  allLabel={t('AdminRegisteredPlatforms.Filters.AllStatuses')}
                  value={filters.status ?? ALL_FILTER_VALUE}
                  options={statusOptions}
                  onValueChange={(value) =>
                    updateFilters({ status: parseStatusFilterValue(value) })
                  }
                  triggerAnalyticsId="admin_registered_platform_statuses_open"
                />
                <UserOrganizationFilter
                  analyticsId="admin_registered_platform_organizations_open"
                  value={filters.organizationId ?? undefined}
                  onChange={(organizationId) =>
                    updateFilters({ organizationId: organizationId ?? null })
                  }
                />
              </>
            }
            actions={<DataTableHeadBarOptions />}
          />
        }
      />
    </TooltipProvider>
  );
};
