'use client';

import { SLA_PERCENT_FORMAT } from '@/components/service/registration/sla-availability-chart.utils';
import { useSaasListLocalstorage } from '@/components/subcription/saas/saas-list-localstorage';
import {
  getContractDaysLeft,
  getHealthIssueRatio,
  getSaasPlatformMetadata,
  getSaasPlatformServicePath,
  getSaasProductName,
} from '@/components/subcription/saas/saas-list.utils';
import { SaasProductFilter } from '@/components/subcription/saas/SaasProductFilter';
import { TruncatedText } from '@/components/subcription/saas/TruncatedText';
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
  type ChipSeverity,
  ProgressBar,
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
  SaasPlatformContractStatus,
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
import Link from 'next/link';
import { ChangeEvent, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

const STORAGE_PERCENT_FORMAT = {
  style: 'percent',
  maximumFractionDigits: 0,
} as const;

const CONTRACT_STATUS_CLASS: Record<SaasPlatformContractStatus, string> = {
  [SaasPlatformContractStatus.Active]: 'text-default-secondary',
  [SaasPlatformContractStatus.EndingSoon]: 'text-feedback-warning-primary',
  [SaasPlatformContractStatus.Ended]: 'text-feedback-error-primary',
};

const HEALTH_ISSUE_CHIPS = {
  [SaasPlatformHealthIssue.Availability]: {
    labelKey: 'CSMBoard.HealthSla',
    percentFormat: SLA_PERCENT_FORMAT,
    severity: 'critical',
  },
  [SaasPlatformHealthIssue.Database]: {
    labelKey: 'CSMBoard.HealthDatabase',
    percentFormat: STORAGE_PERCENT_FORMAT,
    severity: 'medium',
  },
  [SaasPlatformHealthIssue.FileStorage]: {
    labelKey: 'CSMBoard.HealthFileStorage',
    percentFormat: STORAGE_PERCENT_FORMAT,
    severity: 'medium',
  },
} satisfies Record<
  SaasPlatformHealthIssue,
  {
    labelKey: string;
    percentFormat: Intl.NumberFormatOptions;
    severity: ChipSeverity;
  }
>;

export const SaasList = () => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
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

  const renderStorageUsage = (
    percent: number | null | undefined,
    label: string,
    isHigh: boolean
  ) =>
    typeof percent === 'number' && (
      <span className="flex min-w-0 items-center gap-2">
        <ProgressBar
          value={percent}
          aria-label={label}
          className={cn(
            'w-8 shrink-0',
            // The design system has no alert tone for a progress bar: its indicator is painted directly
            isHigh &&
              '[&>[data-slot=progress-bar-indicator]]:bg-feedback-alert-primary'
          )}
        />
        <span className={cn(isHigh && 'text-feedback-alert-primary')}>
          {format.number(percent / 100, STORAGE_PERCENT_FORMAT)}
        </span>
      </span>
    );

  const getHealthIssueLabel = (
    platform: SaasPlatformRowFragment,
    issue: SaasPlatformHealthIssue
  ) => {
    const ratio = getHealthIssueRatio(platform, issue);
    return t(HEALTH_ISSUE_CHIPS[issue].labelKey, {
      percent:
        ratio === null
          ? ''
          : format.number(ratio, HEALTH_ISSUE_CHIPS[issue].percentFormat),
    });
  };

  const renderHealth = (platform: SaasPlatformRowFragment) => {
    const issues = platform.health_issues;
    if (!issues) {
      return null;
    }
    const [firstIssue, ...otherIssues] = issues;
    if (!firstIssue) {
      return (
        <Chip
          label={t('CSMBoard.Healthy')}
          severity="low"
        />
      );
    }
    const firstIssueLabel = getHealthIssueLabel(platform, firstIssue);
    const firstIssueSeverity = HEALTH_ISSUE_CHIPS[firstIssue].severity;
    if (otherIssues.length === 0) {
      return (
        <Chip
          label={firstIssueLabel}
          severity={firstIssueSeverity}
        />
      );
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Chip
            label={`${firstIssueLabel} +${otherIssues.length}`}
            severity={firstIssueSeverity}
            tabIndex={0}
          />
        </TooltipTrigger>
        <TooltipContent>
          <span className="flex flex-col items-start gap-1">
            {otherIssues.map((issue) => (
              <Chip
                key={issue}
                label={getHealthIssueLabel(platform, issue)}
                severity={HEALTH_ISSUE_CHIPS[issue].severity}
              />
            ))}
          </span>
        </TooltipContent>
      </Tooltip>
    );
  };

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
      cell: ({ row }) => {
        const emails =
          row.original.registered_platform?.organization
            ?.administrator_emails ?? [];
        if (emails.length <= 1) {
          return <span className="truncate">{emails[0]}</span>;
        }
        return (
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
        );
      },
    },
    {
      id: SaasPlatformOrdering.Product,
      accessorFn: (platform) => platform.product,
      sortDescFirst: false,
      header: t('CSMBoard.Products'),
      size: 100,
      cell: ({ row }) => {
        const { product, registered_platform } = row.original;
        if (!product) {
          return null;
        }
        const productName = getSaasProductName(product);
        // Only a platform registered in the Hub reports its version.
        const version = registered_platform?.version;
        if (!version) {
          return (
            <Chip
              label={productName}
              severity="info"
            />
          );
        }
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Chip
                label={productName}
                severity="info"
                tabIndex={0}
              />
            </TooltipTrigger>
            <TooltipContent>
              {t('CSMBoard.ProductVersion', { version })}
            </TooltipContent>
          </Tooltip>
        );
      },
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
      size: 130,
      cell: ({ row }) => {
        const {
          metadata: { end_date: endDate },
          contract_status: contractStatus,
        } = row.original;
        if (!endDate) {
          return null;
        }
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'truncate',
                  contractStatus && CONTRACT_STATUS_CLASS[contractStatus]
                )}
                tabIndex={0}>
                {contractStatus === SaasPlatformContractStatus.Ended
                  ? t('CSMBoard.ContractEnded')
                  : t('CSMBoard.EndsIn', {
                      days: getContractDaysLeft(endDate),
                    })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {formatDate(endDate, 'DATE_MEDIUM')}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: 'database',
      header: t('CSMBoard.Database'),
      size: 100,
      // The SaaS Manager cannot order by the usage of a storage
      enableSorting: false,
      cell: ({ row }) =>
        renderStorageUsage(
          row.original.storage?.es_used_size?.percent,
          t('CSMBoard.Database'),
          !!row.original.health_issues?.includes(
            SaasPlatformHealthIssue.Database
          )
        ),
    },
    {
      id: 'file_storage',
      header: t('CSMBoard.FileStorage'),
      size: 100,
      enableSorting: false,
      cell: ({ row }) =>
        renderStorageUsage(
          row.original.storage?.s3_used_size?.percent,
          t('CSMBoard.FileStorage'),
          !!row.original.health_issues?.includes(
            SaasPlatformHealthIssue.FileStorage
          )
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
      cell: ({ row }) => renderHealth(row.original),
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
    // One provider for every tooltip of the table, rather than one per cell.
    <TooltipProvider>
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
            filters={
              <SaasProductFilter
                selectedProduct={product}
                onProductChange={onProductChange}
              />
            }
            actions={<DataTableHeadBarOptions />}
          />
        }
      />
    </TooltipProvider>
  );
};
