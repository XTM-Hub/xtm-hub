'use client';

import { useSaasListLocalstorage } from '@/components/subcription/saas/saas-list-localstorage';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  PortalCapability,
  type SaasPlatformsListQueryVariables,
  useSaasPlatformsListQuery,
} from '@graphql/generated';
import { saasPlatformsKeys } from '@graphql/saas-platforms/saas-platforms.keys';
import { useEffect, useMemo } from 'react';

export const SaasList = () => {
  const canReadSaasMetrics = useUserHasPortalCapability([
    PortalCapability.Bypass,
    PortalCapability.ReadSaasMetrics,
  ]);

  const { pageSize, orderBy, orderMode } = useSaasListLocalstorage();

  const variables = useMemo<SaasPlatformsListQueryVariables>(
    () => ({ first: pageSize, after: null, orderBy, orderMode }),
    [pageSize, orderBy, orderMode]
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
      sortDescFirst: false,
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

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line no-console
      console.log('saasPlatforms', data.saasPlatforms);
    }
  }, [data]);

  return null;
};
