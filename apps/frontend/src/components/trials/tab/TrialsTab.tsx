'use client';
import {
  buildTrialsFilters,
  formatCancellationReason,
  matchSearchRegions,
  sortProducts,
} from '@/components/trials/tab/trials-tab.utils';
import { TrialsProducts } from '@/components/trials/tab/TrialsProducts';
import { TrialsProductValues } from '@/components/trials/tab/TrialsProductValues';
import { TrialsRowActions } from '@/components/trials/tab/TrialsRowActions';
import { useTrialsListLocalstorage } from '@/components/trials/trial-list-localstorage';
import {
  TRIALS_TAB_CONFIG,
  trialsRegionKey,
  TrialsTabType,
} from '@/components/trials/trials.const';
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
import {
  useAdminByPass,
  useUserHasPortalCapability,
} from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { daysUntil, useDateFormatter } from '@/utils/date';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import {
  SearchField,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { CheckIndeterminateIcon } from '@filigran/icon';
import { trialsKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestOrdering,
  OrderingMode,
  PortalCapability,
  TrialsProductFragment,
  TrialsRowFragment,
  useTrialsListQuery,
} from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { ReactNode, useMemo, useState } from 'react';

type TrialsColumn = ColumnDef<TrialsRowFragment>;
type TrialsCellProps = { row: { original: TrialsRowFragment } };
type Translate = (key: string) => string;

const dateColumn = (
  id: 'request_date' | 'start_date' | 'end_date' | 'cancellation_date',
  header: string,
  formatDate: ReturnType<typeof useDateFormatter>,
  enableSorting = true
): TrialsColumn => ({
  accessorKey: id,
  id,
  header,
  enableSorting,
  cell: ({ row }: TrialsCellProps) => (
    <span className="truncate">
      {formatDate(row.original[id], 'DATE_MEDIUM') ?? '-'}
    </span>
  ),
});

const productColumn = (
  id: 'platform_id' | 'platform_url' | 'registration_status',
  header: string,
  valueOf: (product: TrialsProductFragment) => string | null | undefined,
  asLink = false
): TrialsColumn => ({
  id,
  enableSorting: false,
  header,
  cell: ({ row }: TrialsCellProps) => (
    <TrialsProductValues
      products={row.original.children ?? []}
      valueOf={valueOf}
      asLink={asLink}
    />
  ),
});

const productColumns = (t: Translate): TrialsColumn[] => [
  productColumn(
    'platform_id',
    t('TrialsDashboard.Columns.PlatformId'),
    (product) => product.platform_id
  ),
  productColumn(
    'platform_url',
    t('TrialsDashboard.Columns.PlatformUrl'),
    (product) => product.platform_url ?? product.url,
    true
  ),
  productColumn(
    'registration_status',
    t('TrialsDashboard.Columns.RegistrationStatus'),
    (product) =>
      t(
        product.platform_id
          ? 'TrialsDashboard.Registered'
          : 'TrialsDashboard.NotRegistered'
      )
  ),
];

const buildTrialsColumns = (
  type: TrialsTabType,
  t: Translate,
  formatDate: ReturnType<typeof useDateFormatter>,
  isReorderTrialsAllowed: boolean,
  renderActions: (request: TrialsRowFragment) => ReactNode
): TrialsColumn[] => [
  ...(type === TrialsTabType.Waiting
    ? [
        {
          accessorKey: 'ordering',
          id: 'ordering',
          enableSorting: !isReorderTrialsAllowed,
          header: t('TrialsDashboard.Columns.Priority'),
        },
      ]
    : []),
  {
    accessorKey: 'requester_email',
    id: 'requester_email',
    enableSorting: !isReorderTrialsAllowed,
    header: t('TrialsDashboard.Columns.Email'),
  },
  {
    accessorKey: 'organization_name',
    id: 'organization_name',
    enableSorting: !isReorderTrialsAllowed,
    header: t('TrialsDashboard.Columns.Organization'),
  },
  {
    accessorKey: 'children',
    id: 'products',
    enableSorting: false,
    size: 200,
    header: t('TrialsDashboard.Columns.Products'),
    cell: ({ row }: TrialsCellProps) => (
      <TrialsProducts products={row.original.children ?? []} />
    ),
  },
  ...(type === TrialsTabType.Waiting
    ? [
        dateColumn(
          'request_date',
          t('TrialsDashboard.Columns.RequestDate'),
          formatDate,
          !isReorderTrialsAllowed
        ),
      ]
    : [
        dateColumn(
          'start_date',
          t('TrialsDashboard.Columns.StartDate'),
          formatDate,
          !isReorderTrialsAllowed
        ),
        dateColumn(
          'end_date',
          t('TrialsDashboard.Columns.EndDate'),
          formatDate,
          !isReorderTrialsAllowed
        ),
      ]),
  ...(type === TrialsTabType.Running
    ? [
        {
          accessorKey: 'remainingDays',
          id: 'remainingDays',
          enableSorting: false,
          header: t('TrialsDashboard.Columns.RemainingDays'),
          cell: ({ row }: TrialsCellProps) => (
            <span className="truncate">
              {row.original.end_date
                ? daysUntil(new Date(row.original.end_date))
                : '-'}
            </span>
          ),
        },
      ]
    : []),
  {
    accessorKey: 'region',
    id: 'region',
    enableSorting: !isReorderTrialsAllowed,
    header: t('TrialsDashboard.Columns.Region'),
    cell: ({ row }: TrialsCellProps) => (
      <span className="truncate">
        {t(trialsRegionKey(row.original.region))}
      </span>
    ),
  },
  ...productColumns(t),
  ...(type === TrialsTabType.Cancelled
    ? [
        dateColumn(
          'cancellation_date',
          t('TrialsDashboard.Columns.CancellationDate'),
          formatDate
        ),
        {
          accessorKey: 'cancellation_user_email',
          id: 'cancellation_user_email',
          header: t('TrialsDashboard.Columns.CancellationOwner'),
        },
        {
          accessorKey: 'cancellation_reason',
          id: 'cancellation_reason',
          enableSorting: false,
          header: t('TrialsDashboard.Columns.CancellationReason'),
          cell: ({ row }: TrialsCellProps) => {
            if (!row.original.cancellation_reason) {
              return <span>-</span>;
            }
            const reason = formatCancellationReason(
              row.original.cancellation_reason,
              t
            );
            return (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate">{reason}</span>
                  </TooltipTrigger>
                  <TooltipContent>{reason}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          },
        },
      ]
    : []),
  {
    accessorKey: 'actions',
    id: 'actions',
    size: 160,
    enableHiding: false,
    enableSorting: false,
    enableResizing: false,
    header: undefined,
    cell: ({ row }: TrialsCellProps) => (
      <div className="flex items-center justify-end gap-2">
        {renderActions(row.original)}
      </div>
    ),
  },
];

interface TrialsTabProps {
  type: TrialsTabType;
}

const TrialsTab = ({ type }: TrialsTabProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const isAdminByPass = Boolean(useAdminByPass());
  const userHasModifyTrialCapa = useUserHasPortalCapability([
    PortalCapability.ModifyTrials,
  ]);
  const canModifyTrials = Boolean(isAdminByPass || userHasModifyTrialCapa);
  const isReorderTrialsAllowed =
    type === TrialsTabType.Waiting && canModifyTrials;
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const { defaultOrder, defaultOrderMode } = TRIALS_TAB_CONFIG[type];

  const columns = useMemo(
    () =>
      buildTrialsColumns(
        type,
        t,
        formatDate,
        isReorderTrialsAllowed,
        (request) => (
          <TrialsRowActions
            request={request}
            type={type}
            canModifyTrials={canModifyTrials}
            isAdminByPass={isAdminByPass}
          />
        )
      ),
    [
      type,
      t,
      formatDate,
      isReorderTrialsAllowed,
      canModifyTrials,
      isAdminByPass,
    ]
  );

  const {
    orderMode,
    setOrderMode,
    orderBy,
    setOrderBy,
    removeOrder,
    pageSize,
    setPageSize,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    resetAll,
  } = useTrialsListLocalstorage(columns, type, defaultOrder, defaultOrderMode);

  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
  });

  const variables = useMemo(
    () => ({
      count: pagination.pageSize,
      cursor,
      orderBy,
      orderMode,
      searchTerm,
      searchRegions: matchSearchRegions(searchTerm, t),
      filters: buildTrialsFilters(type),
    }),
    [pagination.pageSize, cursor, orderBy, orderMode, searchTerm, t, type]
  );

  const { data } = useTrialsListQuery(portalGraphqlClient, variables, {
    queryKey: trialsKeys.list(variables),
  });

  const requests = useMemo(
    () =>
      (data?.deploymentRequestsList.edges ?? []).map(({ node }) => ({
        ...node,
        children: node.children && sortProducts(node.children),
      })),
    [data]
  );

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<DeploymentRequestOrdering, OrderingMode>({
      updater,
      orderBy,
      orderMode,
      setOrderMode,
      setOrderBy,
      removeOrder,
      handleRefetchData: () => undefined,
    });
  };

  const searchHandlers = useDebouncedSearch({
    apply: (term) => setSearchTerm(term || null),
    appliedTerm: searchTerm,
  });

  return (
    <DataTable
      columns={columns}
      data={requests}
      toolbar={
        <div>
          <DataTableToolbar
            search={
              <SearchField
                fullWidth
                aria-label={t('TrialsDashboard.Actions.SearchTrials')}
                placeholder={t(
                  'TrialsDashboard.Actions.SearchTrialsPlaceholder'
                )}
                clearLabel={t('DesignSystem.SearchField.Clear')}
                onChange={searchHandlers.onChange}
                onClear={searchHandlers.onClear}
              />
            }
            actions={<DataTableHeadBarOptions />}
          />
          <div className="border border-solid border-alert-warning rounded text-feedback-warning-primary flex items-center gap-1 p-2 text-sm mt-4">
            <CheckIndeterminateIcon className="shrink-0 h-4 w-4 mr-1" />
            {t('TrialsDashboard.WarningCancellation')}
          </div>
        </div>
      }
      onResetTable={resetAll}
      tableOptions={{
        onSortingChange,
        onPaginationChange,
        manualSorting: true,
        manualPagination: true,
        rowCount: data?.deploymentRequestsList.totalCount ?? 0,
        onColumnOrderChange: setColumnOrder,
        onColumnVisibilityChange: setColumnVisibility,
      }}
      {...getDataTableLabels(t)}
      tableState={{
        sorting: mapToSortingTableValue(orderBy, orderMode),
        pagination,
        columnOrder,
        columnVisibility,
      }}
    />
  );
};

export default TrialsTab;
