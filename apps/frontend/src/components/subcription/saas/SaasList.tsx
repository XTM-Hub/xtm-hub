'use client';

import { SLA_PERCENT_FORMAT } from '@/components/service/registration/sla-availability-chart.utils';
import { SaasAdministrators } from '@/components/subcription/saas/datatable/SaasAdministrators';
import { SaasContractEnd } from '@/components/subcription/saas/datatable/SaasContractEnd';
import { SaasPlatformHealth } from '@/components/subcription/saas/datatable/SaasPlatformHealth';
import { SaasPlatformLink } from '@/components/subcription/saas/datatable/SaasPlatformLink';
import { SaasProductChip } from '@/components/subcription/saas/datatable/SaasProductChip';
import { SaasStorageUsage } from '@/components/subcription/saas/datatable/SaasStorageUsage';
import { useSaasListLocalstorage } from '@/components/subcription/saas/saas-list-localstorage';
import { SaasProductFilter } from '@/components/subcription/saas/SaasProductFilter';
import {
  SAAS_LIST_TOUR_TARGET,
  saasListTourTarget,
} from '@/components/subcription/saas/tour/saas-list-tour';
import {
  SaasListTourArea,
  SaasListTourButton,
  SaasListTourProvider,
} from '@/components/subcription/saas/tour/SaasListTour';
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
import { TruncatedText } from '@/components/ui/truncated-text';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { cn } from '@/lib/utils';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { Chip, SearchField, TooltipProvider } from '@filigran/design-system';
import {
  OrderingMode,
  PortalCapability,
  type SaasManagerPlatformsListQueryVariables,
  SaasPlatformHealthIssue,
  SaasPlatformOrdering,
  type SaasPlatformRowFragment,
  type SaasProduct,
  ServiceDefinitionIdentifier,
  useSaasManagerPlatformsListQuery,
} from '@graphql/generated';
import { saasPlatformsKeys } from '@graphql/saas-platforms/saas-platforms.keys';
import { ColumnDef } from '@tanstack/react-table';
import { useFormatter } from 'next-intl';
import { ChangeEvent, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

export const SaasList = () => {
  const t = useTranslate();
  const format = useFormatter();
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
  const [product, setProduct] = useState<SaasProduct | null>(null);
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
      product,
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      orderBy,
      orderMode,
      searchTerm,
      product,
    ]
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
      size: 120,
      cell: ({ row }) =>
        row.original.customer && <TruncatedText text={row.original.customer} />,
    },
    {
      id: 'organization',
      header: t('CSMBoard.Organization'),
      size: 120,
      // The SaaS Manager cannot order by an organization of the Hub
      enableSorting: false,
      cell: ({ row }) => {
        const organization = row.original.registered_platform?.organization;
        if (!organization) {
          return null;
        }
        const administratorEmails = organization.administrator_emails ?? [];
        return (
          <TruncatedText
            text={organization.name}
            details={
              administratorEmails.length > 0 &&
              administratorEmails.map((email) => (
                <span
                  key={email}
                  className="text-default-secondary">
                  {email}
                </span>
              ))
            }
          />
        );
      },
    },
    {
      id: 'administrators',
      header: t('CSMBoard.Administrators'),
      size: 130,
      enableSorting: false,
      cell: ({ row }) => (
        <SaasAdministrators
          emails={
            row.original.registered_platform?.organization
              ?.administrator_emails ?? []
          }
        />
      ),
    },
    {
      id: SaasPlatformOrdering.Product,
      accessorFn: (platform) => platform.product,
      sortDescFirst: false,
      header: t('CSMBoard.Products'),
      size: 100,
      cell: ({ row }) =>
        row.original.product && (
          <SaasProductChip
            product={row.original.product}
            // Only a platform registered in the Hub reports its version.
            version={row.original.registered_platform?.version}
          />
        ),
    },
    {
      id: SaasPlatformOrdering.Plan,
      accessorFn: (platform) => platform.metadata.plan,
      sortDescFirst: false,
      header: t('CSMBoard.Plan'),
      size: 90,
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
      size: 130,
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
        return <SaasPlatformLink registeredPlatform={registeredPlatform} />;
      },
    },
    {
      id: SaasPlatformOrdering.EndDate,
      accessorFn: (platform) => platform.metadata.end_date,
      sortDescFirst: false,
      header: t('CSMBoard.ContractEnd'),
      size: 130,
      cell: ({ row }) =>
        row.original.metadata.end_date && (
          <SaasContractEnd
            endDate={row.original.metadata.end_date}
            contractStatus={row.original.contract_status}
          />
        ),
    },
    {
      id: 'database',
      header: t('CSMBoard.Database'),
      size: 100,
      // The SaaS Manager cannot order by the usage of a storage
      enableSorting: false,
      cell: ({ row }) => (
        <SaasStorageUsage
          percent={row.original.storage?.es_used_size?.percent}
          label={t('CSMBoard.Database')}
          isHigh={
            !!row.original.health_issues?.includes(
              SaasPlatformHealthIssue.Database
            )
          }
        />
      ),
    },
    {
      id: 'file_storage',
      header: t('CSMBoard.FileStorage'),
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <SaasStorageUsage
          percent={row.original.storage?.s3_used_size?.percent}
          label={t('CSMBoard.FileStorage')}
          isHigh={
            !!row.original.health_issues?.includes(
              SaasPlatformHealthIssue.FileStorage
            )
          }
        />
      ),
    },
    {
      id: 'availability',
      header: t('CSMBoard.Availability'),
      size: 100,
      enableSorting: false,
      cell: ({ row }) => {
        const { sla_cmtd: availability, health_issues } = row.original;
        if (availability === null) {
          return null;
        }
        return (
          <span
            className={cn(
              'truncate',
              health_issues?.includes(SaasPlatformHealthIssue.Availability) &&
                'text-feedback-error-primary'
            )}>
            {format.number(availability, SLA_PERCENT_FORMAT)}
          </span>
        );
      },
    },
    {
      id: 'version',
      header: t('CSMBoard.Version'),
      size: 90,
      // The version is the one the platform reports to the Hub: the SaaS Manager cannot order by it
      enableSorting: false,
      cell: ({ row }) => (
        <span className="truncate">
          {row.original.registered_platform?.version}
        </span>
      ),
    },
    {
      id: 'health',
      header: t('CSMBoard.Health'),
      size: 170,
      // The health of each platform is rated by the Hub: the SaaS Manager cannot order by it
      enableSorting: false,
      cell: ({ row }) => <SaasPlatformHealth platform={row.original} />,
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

  const onProductChange = (nextProduct: SaasProduct | null) => {
    setProduct(nextProduct);
    resetToFirstPage();
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
    <SaasListTourProvider>
      {/* One provider for every tooltip of the table, rather than one per cell. */}
      <TooltipProvider>
        <SaasListTourArea>
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
                  <div {...saasListTourTarget(SAAS_LIST_TOUR_TARGET.Search)}>
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
                  </div>
                }
                filters={
                  <div
                    {...saasListTourTarget(
                      SAAS_LIST_TOUR_TARGET.ProductFilter
                    )}>
                    <SaasProductFilter
                      selectedProduct={product}
                      onProductChange={onProductChange}
                    />
                  </div>
                }
                actions={
                  <>
                    <SaasListTourButton />
                    <div
                      {...saasListTourTarget(
                        SAAS_LIST_TOUR_TARGET.TableOptions
                      )}>
                      <DataTableHeadBarOptions />
                    </div>
                  </>
                }
              />
            }
          />
        </SaasListTourArea>
      </TooltipProvider>
    </SaasListTourProvider>
  );
};
