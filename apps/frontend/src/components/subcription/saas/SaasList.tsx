'use client';

import { useSaasListLocalstorage } from '@/components/subcription/saas/saas-list-localstorage';
import {
  getSaasPlatformMetadata,
  getSaasPlatformProductName,
  getSaasPlatformServicePath,
} from '@/components/subcription/saas/saas-list.utils';
import { DataTable, DataTableHeadBarOptions } from '@/components/ui/data-table';
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
  RegisteredPlatformOrdering,
  type SaasPlatformsListQuery,
  type SaasPlatformsListQueryVariables,
  useSaasPlatformsListQuery,
} from '@graphql/generated';
import { saasPlatformsKeys } from '@graphql/saas-platforms/saas-platforms.keys';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { ChangeEvent, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

type SaasPlatform =
  SaasPlatformsListQuery['saasPlatforms']['edges'][number]['node'];

export const SaasList = () => {
  const t = useTranslate();
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
  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
    });

  const variables = useMemo<SaasPlatformsListQueryVariables>(
    () => ({
      first: pagination.pageSize,
      after: cursor,
      orderBy,
      orderMode,
      searchTerm,
    }),
    [pagination.pageSize, cursor, orderBy, orderMode, searchTerm]
  );

  const { data, isLoading, isError } = useSaasPlatformsListQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: saasPlatformsKeys.list(variables),
      enabled: !!canReadSaasMetrics,
    }
  );

  const columns: ColumnDef<SaasPlatform>[] = [
    {
      id: RegisteredPlatformOrdering.OrganizationName,
      accessorFn: (platform) => platform.organization?.name,
      // Without it, react-table infers the first sort direction from the first row's value
      // and removes the sorting instead of toggling it when that row has no organization
      sortDescFirst: false,
      header: t('CSMBoard.Organization'),
      cell: ({ row }) => (
        <span className="truncate">{row.original.organization?.name}</span>
      ),
    },
    {
      id: 'administrators',
      header: t('CSMBoard.Administrators'),
      enableSorting: false,
      cell: ({ row }) => {
        const emails = row.original.organization?.administrator_emails ?? [];
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
      id: 'product',
      header: t('CSMBoard.Products'),
      enableSorting: false,
      cell: ({ row }) => (
        <Chip label={getSaasPlatformProductName(row.original.identifier)} />
      ),
    },
    {
      id: 'link',
      header: t('CSMBoard.Link'),
      enableSorting: false,
      cell: ({ row }) => {
        const platformMetadata = getSaasPlatformMetadata(
          row.original.identifier
        );
        return (
          <span className="flex min-w-0 items-center gap-s">
            {platformMetadata && (
              <platformMetadata.Icon
                className={cn(
                  'size-4 shrink-0',
                  platformMetadata.iconClassName
                )}
              />
            )}
            <Link
              href={getSaasPlatformServicePath(row.original)}
              className="truncate text-filigran-brand-primary underline">
              {t('CSMBoard.ViewMetrics')}
            </Link>
          </span>
        );
      },
    },
    {
      id: 'version',
      header: t('CSMBoard.Version'),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="truncate">{row.original.version}</span>
      ),
    },
  ];

  const saasPlatforms = useMemo<SaasPlatform[]>(
    () => (data?.saasPlatforms.edges ?? []).map(({ node }) => node),
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
    handleSortingChange<RegisteredPlatformOrdering>({
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
      {isError && (
        <div className="mb-s text-sm text-destructive">{t('Utils.Error')}</div>
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
          rowCount: data?.saasPlatforms.totalCount ?? 0,
        }}
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
        }}
        toolbar={
          <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
            <label
              htmlFor="saas-platforms-search"
              className="sr-only">
              {t('CSMBoard.SearchOrganization')}
            </label>
            <div className="w-full sm:w-1/3">
              <SearchField
                id="saas-platforms-search"
                fullWidth
                placeholder={t('CSMBoard.SearchOrganization')}
                clearLabel={t('CSMBoard.ClearSearch')}
                onChange={onSearchChange}
                onClear={onSearchClear}
              />
            </div>
            <div className="flex w-full items-center justify-end gap-s sm:w-auto">
              <DataTableHeadBarOptions />
            </div>
          </div>
        }
      />
    </>
  );
};
