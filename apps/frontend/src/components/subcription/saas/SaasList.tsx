'use client';

import { useSaasListLocalstorage } from '@/components/subcription/saas/saas-list-localstorage';
import {
  getContractEndStatus,
  getSaasPlatformMetadata,
  getSaasPlatformServicePath,
  getSaasProductName,
} from '@/components/subcription/saas/saas-list.utils';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
} from '@/components/ui/data-table';
import {
  handleSortingChange,
  mapToSortingTableValue,
  OrderingMode as SortingOrderingMode,
} from '@/components/ui/handle-sorting.utils';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { cn } from '@/lib/utils';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { useDateFormatter } from '@/utils/date';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import {
  Chip,
  SearchField,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import {
  OrderingMode,
  PortalCapability,
  type SaasManagerPlatformsListQueryVariables,
  SaasPlatformOrdering,
  type SaasPlatformRowFragment,
  ServiceDefinitionIdentifier,
  useSaasManagerPlatformsListQuery,
} from '@graphql/generated';
import { saasPlatformsKeys } from '@graphql/saas-platforms/saas-platforms.keys';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { ChangeEvent, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

export const SaasList = () => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const canReadSaasMetrics = useUserHasPortalCapability([
    PortalCapability.Bypass,
    PortalCapability.ReadSaasMetrics,
  ]);

  const {
    pageSize,
    setPageSize,
    orderBy,
    setOrderBy,
    orderMode,
    setOrderMode,
    resetAll,
    removeOrder,
  } = useSaasListLocalstorage();
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const { pagination, setPagination, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
  });

  const variables = useMemo<SaasManagerPlatformsListQueryVariables>(
    () => ({
      // The SaaS Manager counts its pages from 1
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      orderBy,
      orderMode,
      searchTerm,
    }),
    [pagination.pageIndex, pagination.pageSize, orderBy, orderMode, searchTerm]
  );

  const { data, isLoading, isError } = useSaasManagerPlatformsListQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: saasPlatformsKeys.list(variables),
      enabled: !!canReadSaasMetrics,
    }
  );

  const columns: ColumnDef<SaasPlatformRowFragment>[] = [
    {
      id: SaasPlatformOrdering.CustomerName,
      accessorFn: (platform) => platform.customer,
      // Without it, react-table infers the first sort direction from the first row's value
      // and removes the sorting instead of toggling it when that row has no customer
      sortDescFirst: false,
      header: t('CSMBoard.Customer'),
      cell: ({ row }) => (
        <span className="truncate">{row.original.customer}</span>
      ),
    },
    {
      id: 'organization',
      header: t('CSMBoard.Organization'),
      // The SaaS Manager cannot order by an organization of the Hub
      enableSorting: false,
      cell: ({ row }) => (
        <span className="truncate">
          {row.original.registered_platform?.organization?.name}
        </span>
      ),
    },
    {
      id: 'administrators',
      header: t('CSMBoard.Administrators'),
      enableSorting: false,
      cell: ({ row }) => {
        const emails =
          row.original.registered_platform?.organization
            ?.administrator_emails ?? [];
        if (emails.length <= 1) {
          return <span className="truncate">{emails[0]}</span>;
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="truncate"
                  tabIndex={0}>
                  {emails.join(', ')}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {emails.map((email) => (
                  <div key={email}>{email}</div>
                ))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: SaasPlatformOrdering.Product,
      accessorFn: (platform) => platform.product,
      sortDescFirst: false,
      header: t('CSMBoard.Products'),
      cell: ({ row }) =>
        row.original.product && (
          <Chip
            label={getSaasProductName(row.original.product)}
            severity="info"
          />
        ),
    },
    {
      id: SaasPlatformOrdering.Plan,
      accessorFn: (platform) => platform.metadata.plan,
      sortDescFirst: false,
      header: t('CSMBoard.Plan'),
      cell: ({ row }) =>
        row.original.metadata.plan && (
          <Chip
            label={row.original.metadata.plan}
            severity="info"
          />
        ),
    },
    {
      id: 'link',
      header: t('CSMBoard.Link'),
      enableSorting: false,
      cell: ({ row }) => {
        // Only a platform registered in the Hub has a metrics page.
        const registeredPlatform = row.original.registered_platform;
        if (
          !registeredPlatform ||
          registeredPlatform.identifier ===
            ServiceDefinitionIdentifier.XtmoneRegistration
        ) {
          return null;
        }
        const platformMetadata = getSaasPlatformMetadata(
          registeredPlatform.identifier
        );

        return (
          <span className="flex min-w-0 items-center gap-2">
            {platformMetadata && (
              <platformMetadata.Icon
                className={cn(
                  'size-4 shrink-0',
                  platformMetadata.iconClassName
                )}
              />
            )}
            <Link
              href={getSaasPlatformServicePath(registeredPlatform)}
              className="truncate text-filigran-brand-primary underline">
              {t('CSMBoard.ViewMetrics')}
            </Link>
          </span>
        );
      },
    },
    {
      id: SaasPlatformOrdering.EndDate,
      accessorFn: (platform) => platform.metadata.end_date,
      sortDescFirst: false,
      header: t('CSMBoard.ContractEnd'),
      cell: ({ row }) => {
        const endDate = row.original.metadata.end_date;
        if (!endDate) {
          return null;
        }
        const { daysLeft, isEndingSoon } = getContractEndStatus(endDate);
        return (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">
              {formatDate(endDate, 'DATE_MEDIUM')}
            </span>
            <span
              className={cn(
                'shrink-0',
                isEndingSoon
                  ? 'text-feedback-warning-primary'
                  : 'text-default-secondary'
              )}>
              {t('CSMBoard.EndsIn', { days: daysLeft })}
            </span>
          </span>
        );
      },
    },
    {
      id: 'version',
      header: t('CSMBoard.Version'),
      // The version is the one the platform reports to the Hub: the SaaS Manager cannot order by it
      enableSorting: false,
      cell: ({ row }) => (
        <span className="truncate">
          {row.original.registered_platform?.version}
        </span>
      ),
    },
  ];

  const saasPlatforms = useMemo<SaasPlatformRowFragment[]>(
    () => data?.saasManagerPlatforms?.platforms ?? [],
    [data]
  );

  const resetToFirstPage = () =>
    setPagination((previousPagination) => ({
      ...previousPagination,
      pageIndex: 0,
    }));

  const updateSearchTerm = (nextSearchTerm: string) => {
    setSearchTerm(nextSearchTerm.trim() || null);
    resetToFirstPage();
  };

  const onSearchChange = useDebounceCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      updateSearchTerm(event.target.value),
    DEBOUNCE_TIME
  );

  const onSearchClear = () => {
    onSearchChange.cancel();
    updateSearchTerm('');
  };

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<SaasPlatformOrdering>({
      updater,
      orderBy,
      orderMode: orderMode as unknown as SortingOrderingMode,
      setOrderBy,
      setOrderMode: (nextOrderMode) =>
        setOrderMode(nextOrderMode as OrderingMode),
      removeOrder,
      handleRefetchData: resetToFirstPage,
    });
  };

  return (
    <>
      {/* null when the SaaS Manager cannot be reached */}
      {(isError || data?.saasManagerPlatforms === null) && (
        <div className="mb-2 text-sm text-feedback-error-primary">
          {t('Utils.Error')}
        </div>
      )}
      <DataTable
        columns={columns}
        data={saasPlatforms}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange,
          onPaginationChange,
          manualSorting: true,
          manualPagination: true,
          rowCount: data?.saasManagerPlatforms?.totalCount ?? 0,
        }}
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
        }}
        toolbar={
          <DataTableToolbar
            search={
              <>
                <label
                  htmlFor="saas-platforms-search"
                  className="sr-only">
                  {t('CSMBoard.SearchPlatform')}
                </label>
                <SearchField
                  id="saas-platforms-search"
                  fullWidth
                  placeholder={t('CSMBoard.SearchPlatform')}
                  clearLabel={t('CSMBoard.ClearSearch')}
                  onChange={onSearchChange}
                  onClear={onSearchClear}
                />
              </>
            }
            actions={<DataTableHeadBarOptions />}
          />
        }
      />
    </>
  );
};
