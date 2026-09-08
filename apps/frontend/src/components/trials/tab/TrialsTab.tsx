'use client';
import { TrialsManageUsersDialog } from '@/components/service/trial-instances/manage-users/TrialsManageUsersDialog';
import {
  buildTrialsFilters,
  formatCancellationReason,
  sortProducts,
} from '@/components/trials/tab/trials-tab.utils';
import { TrialsProducts } from '@/components/trials/tab/TrialsProducts';
import { TrialsProductValues } from '@/components/trials/tab/TrialsProductValues';
import { useTrialsListLocalstorage } from '@/components/trials/trial-list-localstorage';
import {
  TRIALS_TAB_CONFIG,
  trialsRegionKey,
  TrialsScope,
  TrialsTabType,
} from '@/components/trials/trials.const';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import {
  handleSortingChange,
  mapToSortingTableValue,
} from '@/components/ui/handle-sorting.utils';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  useAdminByPass,
  useUserHasPortalCapability,
} from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { i18nKey } from '@/utils/datatable';
import { daysUntil, useDateFormatter } from '@/utils/date';
import { APP_PATH } from '@/utils/path/constant';
import {
  ArrowShapeUpIcon,
  ArrowShapeUpStackIcon,
  CheckIndeterminateIcon,
  CloseIcon,
  GroupIcon,
} from '@filigran/icon';
import {
  Button,
  DataTable,
  DataTableHeadBarOptions,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
import { trialsKeys } from '@graphql/deployment/deployment.keys';
import {
  DeploymentRequestHubStatus,
  DeploymentRequestOrdering,
  OrderingMode,
  PortalCapability,
  ReorderDeploymentRequestInQueueDirection,
  TrialsProductFragment,
  TrialsRowFragment,
  useTrialsAdminCancelDeploymentRequestMutation,
  useTrialsListQuery,
  useTrialsReorderDeploymentRequestInQueueMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ReactNode, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

type TrialsColumn = ColumnDef<TrialsRowFragment>;
type TrialsCellProps = { row: { original: TrialsRowFragment } };
type Translate = (key: string) => string;
type TrialsProductValue = Pick<
  TrialsProductFragment,
  'platform_id' | 'platform_url'
>;

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
  scope: TrialsScope,
  valueOf: (product: TrialsProductValue) => string | null | undefined
): TrialsColumn => ({
  accessorKey: id,
  id,
  enableSorting: false,
  header,
  cell: ({ row }: TrialsCellProps) =>
    scope.kind === 'bundle' ? (
      <TrialsProductValues
        products={row.original.children ?? []}
        valueOf={valueOf}
      />
    ) : (
      <span className="truncate">{valueOf(row.original) || '-'}</span>
    ),
});

const productColumns = (scope: TrialsScope, t: Translate): TrialsColumn[] => [
  productColumn(
    'platform_id',
    t('TrialsDashboard.Columns.PlatformId'),
    scope,
    (product) => product.platform_id
  ),
  productColumn(
    'platform_url',
    t('TrialsDashboard.Columns.PlatformUrl'),
    scope,
    (product) => product.platform_url
  ),
  productColumn(
    'registration_status',
    t('TrialsDashboard.Columns.RegistrationStatus'),
    scope,
    (product) =>
      t(
        product.platform_id
          ? 'TrialsDashboard.Registered'
          : 'TrialsDashboard.NotRegistered'
      )
  ),
];

interface TrialsRowActionsProps {
  request: TrialsRowFragment;
  type: TrialsTabType;
  scope: TrialsScope;
}

const TrialsRowActions = ({ request, type, scope }: TrialsRowActionsProps) => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const isAdminByPass = useAdminByPass();
  const userHasModifyTrialCapa = useUserHasPortalCapability([
    PortalCapability.ModifyTrials,
  ]);
  const canModifyTrial = isAdminByPass || userHasModifyTrialCapa;

  const isBundle = scope.kind === 'bundle';

  const invalidateTrials = () =>
    queryClient.invalidateQueries({ queryKey: trialsKeys.all() });

  const onError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'UnknownError';
    toast({
      variant: 'destructive',
      title: t('Utils.Error'),
      description: <>{t(`Error.Server.${errorMessage}`)}</>,
    });
  };

  const { mutate: cancelRequest } =
    useTrialsAdminCancelDeploymentRequestMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await invalidateTrials();
        toast({
          title: t('Utils.Success'),
          description: t(
            isBundle
              ? 'TrialsDashboard.Toast.BundleCancelled'
              : 'Service.Trials.Cancellation.Toast.Admin'
          ),
        });
      },
      onError,
    });

  const { mutate: reorderRequest } =
    useTrialsReorderDeploymentRequestInQueueMutation(portalGraphqlClient, {
      onSuccess: async () => {
        await invalidateTrials();
        toast({
          title: t('Utils.Success'),
          description: t(
            isBundle
              ? 'TrialsDashboard.Toast.BundleReordered'
              : 'TrialsDashboard.Toast.TrialsReordered'
          ),
        });
      },
      onError,
    });

  const isCancellable =
    canModifyTrial &&
    (type === TrialsTabType.Running || type === TrialsTabType.Waiting);
  const isReorderable = canModifyTrial && type === TrialsTabType.Waiting;
  const canManageUsers =
    type === TrialsTabType.Running &&
    isAdminByPass &&
    request.hub_status === DeploymentRequestHubStatus.Active;

  return (
    <>
      {isCancellable && (
        <AlertDialogComponent
          AlertTitle={t('Service.Trials.Cancellation.Confirmation.Title')}
          actionButtonText={t('MenuActions.Delete')}
          triggerElement={
            <Button
              variant="tertiary-destructive"
              size="icon"
              className="border m-1"
              aria-label={t(
                isBundle
                  ? 'TrialsDashboard.Actions.CancelBundle'
                  : 'TrialsDashboard.Actions.CancelTrial'
              )}>
              <CloseIcon className="h-4 w-4" />
            </Button>
          }
          onClickContinue={() =>
            cancelRequest({ deploymentRequestId: request.id })
          }>
          {t(
            isBundle
              ? 'TrialsDashboard.Cancellation.Confirmation'
              : 'Service.Trials.Cancellation.Confirmation.Admin',
            { organizationName: request.organization_name ?? '' }
          )}
        </AlertDialogComponent>
      )}
      {isReorderable && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="tertiary"
                  size="icon"
                  className="border m-1"
                  aria-label={t('TrialsDashboard.Actions.MoveToTop')}
                  onClick={() =>
                    reorderRequest({
                      input: {
                        id: request.id,
                        direction: ReorderDeploymentRequestInQueueDirection.Top,
                      },
                    })
                  }>
                  <ArrowShapeUpStackIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('TrialsDashboard.Actions.MoveToTop')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="tertiary"
                  size="icon"
                  className="border m-1"
                  aria-label={t('TrialsDashboard.Actions.MoveUp')}
                  onClick={() =>
                    reorderRequest({
                      input: {
                        id: request.id,
                        direction: ReorderDeploymentRequestInQueueDirection.Up,
                      },
                    })
                  }>
                  <ArrowShapeUpIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('TrialsDashboard.Actions.MoveUp')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
      {canManageUsers && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {isBundle ? (
                <Button
                  asChild
                  variant="tertiary"
                  size="icon"
                  className="border m-1"
                  aria-label={t('Service.Trials.ManageUsers.Title')}>
                  <Link
                    href={`/${APP_PATH}/service/xtm-platform-trial/${request.service_instance_id}/manage-users`}>
                    <GroupIcon className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <TrialsManageUsersDialog
                  serviceInstanceId={request.service_instance_id}
                  organizationId={request.organization_requester_id}
                  trigger={
                    <Button
                      variant="tertiary"
                      size="icon"
                      className="border m-1"
                      aria-label={t('Service.Trials.ManageUsers.Title')}>
                      <GroupIcon className="h-4 w-4" />
                    </Button>
                  }
                />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {t('Service.Trials.ManageUsers.Title')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
};

const buildTrialsColumns = (
  type: TrialsTabType,
  scope: TrialsScope,
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
  ...(scope.kind === 'bundle'
    ? [
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
      ]
    : []),
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
  ...(scope.kind === 'product'
    ? [
        {
          accessorKey: 'hub_status',
          id: 'hub_status',
          enableSorting: !isReorderTrialsAllowed,
          header: t('TrialsDashboard.Columns.Status'),
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
  ...productColumns(scope, t),
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
                  <TooltipContent className="max-w-md">{reason}</TooltipContent>
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
      <div className="flex items-center justify-end">
        {renderActions(row.original)}
      </div>
    ),
  },
];

interface TrialsTabProps {
  type: TrialsTabType;
  scope: TrialsScope;
}

const TrialsTab = ({ type, scope }: TrialsTabProps) => {
  const t = useTranslations();
  const formatDate = useDateFormatter();
  const isAdminByPass = useAdminByPass();
  const userHasModifyTrialCapa = useUserHasPortalCapability([
    PortalCapability.ModifyTrials,
  ]);
  const isReorderTrialsAllowed = Boolean(
    type === TrialsTabType.Waiting && (isAdminByPass || userHasModifyTrialCapa)
  );
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const { defaultOrder, defaultOrderMode } = TRIALS_TAB_CONFIG[type];

  const columns = useMemo(
    () =>
      buildTrialsColumns(
        type,
        scope,
        t,
        formatDate,
        isReorderTrialsAllowed,
        (request) => (
          <TrialsRowActions
            request={request}
            type={type}
            scope={scope}
          />
        )
      ),
    [type, scope, t, formatDate, isReorderTrialsAllowed]
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
  } = useTrialsListLocalstorage(
    columns,
    type,
    scope,
    defaultOrder,
    defaultOrderMode
  );

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
      filters: buildTrialsFilters(type, scope),
    }),
    [pagination.pageSize, cursor, orderBy, orderMode, searchTerm, type, scope]
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

  const debounceHandleInput = useDebounceCallback(
    (event) => setSearchTerm(event.target.value || null),
    DEBOUNCE_TIME
  );

  return (
    <DataTable
      columns={columns}
      data={requests}
      toolbar={
        <div>
          <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
            <label
              htmlFor="trials-search"
              className="sr-only">
              {t('TrialsDashboard.Actions.SearchTrials')}
            </label>
            <SearchInput
              id="trials-search"
              containerClass="w-full sm:w-1/3"
              placeholder={t('TrialsDashboard.Actions.SearchTrials')}
              onChange={debounceHandleInput}
            />
            <div className="flex w-full items-center justify-between gap-s sm:w-auto">
              <DataTableHeadBarOptions />
            </div>
          </div>
          <div className="border border-solid border-orange rounded text-feedback-warning-primary flex items-center gap-xs p-s text-sm mt-4">
            <CheckIndeterminateIcon className="shrink-0 h-4 w-4 mr-xs" />
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
      i18nKey={i18nKey(t)}
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
