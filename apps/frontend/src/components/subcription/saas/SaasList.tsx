'use client';

import { useSaasListLocalstorage } from '@/components/subcription/saas/saas-list-localstorage';
import {
  getSaasPlatformMetadata,
  getSaasPlatformProductName,
  getSaasPlatformServicePath,
} from '@/components/subcription/saas/saas-list.utils';
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
import { i18nKey } from '@/utils/datatable';
import { Badge, DataTable, DataTableHeadBarOptions } from '@filigran/ui';
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
import { useMemo } from 'react';

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
  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
    });

  const variables = useMemo<SaasPlatformsListQueryVariables>(
    () => ({ first: pagination.pageSize, after: cursor, orderBy, orderMode }),
    [pagination.pageSize, cursor, orderBy, orderMode]
  );

  const { data, isLoading } = useSaasPlatformsListQuery(
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
      header: t('CSMBoard.Organization'),
      cell: ({ row }) => (
        <span className="truncate">{row.original.organization?.name}</span>
      ),
    },
    {
      id: 'product',
      header: t('CSMBoard.Products'),
      enableSorting: false,
      cell: ({ row }) => (
        <Badge>{getSaasPlatformProductName(row.original.identifier)}</Badge>
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

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<RegisteredPlatformOrdering>({
      updater,
      orderBy,
      orderMode: orderMode as unknown as SortingOrderingMode,
      setOrderBy,
      setOrderMode: (nextOrderMode) =>
        setOrderMode(nextOrderMode as OrderingMode),
      removeOrder,
      handleRefetchData: () =>
        setPagination((previousPagination) => ({
          ...previousPagination,
          pageIndex: 0,
        })),
    });
  };

  return (
    <DataTable
      columns={columns}
      data={saasPlatforms}
      isLoading={isLoading}
      i18nKey={i18nKey(t)}
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
        <div className="flex justify-end">
          <DataTableHeadBarOptions />
        </div>
      }
    />
  );
};
