import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import {
  DataTable,
  DataTableHeadBarOptions,
  SelectionState,
} from '@/components/ui/data-table';
import { useTranslate } from '@/hooks/use-translate';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { Button, Chip } from '@filigran/design-system';
import { AddIcon, DeleteIcon, MoreVertIcon } from '@filigran/icon';
import {
  OrderingMode,
  OrganizationCapability,
  ServiceInstanceItemFragment,
  ServiceInstanceWithCapabilitiesItemFragment,
  ServiceRestriction,
  SubscriptionByIdQuery,
  UserServiceItemFragment,
  UserServiceOrdering,
  useServiceUserCapabilitiesQuery,
  useSubscriptionByIdQuery,
  useUserServicesFromSubscriptionQuery,
} from '@graphql/generated';
import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { userServicesKeys } from '@graphql/user-service/user-service.keys';
import { keepPreviousData } from '@tanstack/react-query';
import { ColumnDef, PaginationState, Updater } from '@tanstack/react-table';

import { useContext, useMemo, useState } from 'react';

import { DeleteUserService } from '@/components/subcription/[slug]/DeleteUserService';
import { SubscriptionSlugUserService } from '@/components/subcription/[slug]/SubscriptionSlugUserService';
import {
  BreadcrumbNav,
  BreadcrumbNavLink,
} from '@/components/ui/BreadcrumbNav';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';

import Loader from '@/components/Loader';
import { PortalContext } from '@/components/me/AppPortalContext';
import ServiceSlugHeader from '@/components/service/[slug]/ServiceSlugHeader';
import { SubscriptionSlugAddCapabilities } from '@/components/subcription/[slug]/SubscriptionSlugAddCapabilities';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { ADMIN_SERVICE_CATALOG_PATH, APP_PATH } from '@/utils/path/constant';
import { notFound } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';

interface SubscriptionSlugProps {
  subscriptionId: string;
  serviceInstance?: ServiceInstanceItemFragment;
}

interface SubscriptionSlugContentProps {
  queryDataSubscription: SubscriptionByIdQuery;
  userData: UserServiceItemFragment[];
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (updater: Updater<PaginationState>) => void;
  serviceInstance?: ServiceInstanceItemFragment;
}

const emptySelectionState = (): SelectionState => ({
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
});

const SubscriptionSlugContent = ({
  queryDataSubscription,
  userData,
  totalCount,
  pagination,
  onPaginationChange,
  serviceInstance,
}: SubscriptionSlugContentProps) => {
  const t = useTranslate();
  const [editUserService, setEditUserService] = useState<
    UserServiceItemFragment | undefined
  >(undefined);
  const [deleteUserServices, setDeleteUserServices] = useState<
    UserServiceItemFragment[] | undefined
  >(undefined);
  const [openAddCapabilities, setOpenAddCapabilities] = useState(false);
  const [selection, setSelection] =
    useState<SelectionState>(emptySelectionState);

  // A page change or a refetch can swap the rows under a selection, and "select
  // all" would then reach users the admin never saw. New rows start from an
  // empty selection with the bulk dialogs closed, reset during the render so
  // no render pairs them with the previous selection.
  const rowIds = userData.map(({ id }) => id).join(',');
  const [selectionRowIds, setSelectionRowIds] = useState(rowIds);
  if (selectionRowIds !== rowIds) {
    setSelectionRowIds(rowIds);
    setSelection(emptySelectionState());
    setOpenAddCapabilities(false);
    setDeleteUserServices(undefined);
  }

  const { hasOrganizationCapability } = useContext(PortalContext);

  if (!queryDataSubscription.subscriptionById) {
    notFound();
  }

  let breadcrumbValue: BreadcrumbNavLink[];
  if (serviceInstance) {
    breadcrumbValue = [
      { label: 'MenuLinks.Home', href: `/${APP_PATH}` },
      {
        label: `${serviceInstance.name}`,
        original: true,
        href: `/${APP_PATH}/service/${serviceInstance.service_definition!.identifier}/${serviceInstance.id}`,
      },
      {
        label: t('Service.Management.ManageUsers'),
      },
    ];
  } else {
    breadcrumbValue = [
      { label: 'MenuLinks.Home', href: `/${APP_PATH}` },
      { label: 'MenuLinks.Settings' },
      { label: 'MenuLinks.ServiceCatalog', href: ADMIN_SERVICE_CATALOG_PATH },
      {
        label: queryDataSubscription.subscriptionById.service_instance.name,
        href: `/${APP_PATH}/admin/service/${queryDataSubscription.subscriptionById.service_instance.id}`,
        original: true,
      },
      {
        label: queryDataSubscription.subscriptionById.organization.name,
        original: true,
      },
    ];
  }

  // The users are paged on the server, so the actor's own row is not always
  // among them: their capabilities on the service are read on their own. They
  // belong to the subscription of their organization, so they only grant
  // access on that subscription.
  const { data: actorCapabilitiesData } = useServiceUserCapabilitiesQuery(
    portalGraphqlClient,
    {
      service_instance_id:
        queryDataSubscription.subscriptionById.service_instance.id,
    },
    {
      queryKey: serviceUserCapabilitiesKeys.byService({
        service_instance_id:
          queryDataSubscription.subscriptionById.service_instance.id,
      }),
    }
  );
  const actorCapabilities = actorCapabilitiesData?.userServiceCapabilities;
  const canManageAccess =
    actorCapabilities?.subscription_id ===
      queryDataSubscription.subscriptionById.id &&
    actorCapabilities.userServiceCapabilities.some(
      (userServiceCapability) =>
        userServiceCapability.generic_service_capability?.name ===
        ServiceRestriction.ManageAccess
    );
  const canManageOrganizationSubscriptions =
    !!hasOrganizationCapability &&
    (hasOrganizationCapability(
      OrganizationCapability.AdministrateOrganization
    ) ||
      hasOrganizationCapability(OrganizationCapability.ManageSubscription));

  const isBypass = useAdminByPass();

  const canManageUserServices =
    isBypass || canManageAccess || canManageOrganizationSubscriptions;

  const availableCapabilities: BadgeOverflow[] = useMemo(() => {
    const capabilities = (
      queryDataSubscription.subscriptionById?.subscription_capability ?? []
    ).flatMap((subscription_capability) => {
      if (
        !subscription_capability?.service_capability?.id ||
        !subscription_capability?.service_capability?.name
      ) {
        return [];
      }

      return [
        {
          id: subscription_capability.service_capability.id,
          name: subscription_capability.service_capability.name,
        },
      ];
    });

    const manageAccessCapability: BadgeOverflow = {
      id: ServiceRestriction.ManageAccess,
      name: ServiceRestriction.ManageAccess,
    };

    return [manageAccessCapability, ...capabilities];
  }, [queryDataSubscription.subscriptionById]);

  const selectedUserServices = useMemo(() => {
    if (selection.selectAll) {
      return userData.filter(
        (userService) => !selection.excludedIds.has(userService.id)
      );
    }

    return userData.filter((userService) =>
      selection.selectedIds.has(userService.id)
    );
  }, [selection, userData]);

  const columns: ColumnDef<UserServiceItemFragment>[] = useMemo(
    () => [
      {
        accessorKey: 'user.first_name',
        id: 'first_name',
        header: 'First name',
      },
      {
        accessorKey: 'user.last_name',
        id: 'last_name',
        header: 'Last name',
      },
      {
        accessorKey: 'user.email',
        id: 'email',
        header: 'Email',
        size: -1,
      },
      {
        id: 'capabilities',
        size: 350,
        header: t('Service.Capabilities.CapabilitiesTitle'),
        enableSorting: false,
        cell: ({ row }) => {
          const capabilities = row.original?.user_service_capability ?? [];
          if (
            capabilities.length === 1 &&
            capabilities[0]?.generic_service_capability?.name ===
              ServiceRestriction.Access
          ) {
            return <Chip label={ServiceRestriction.Access} />;
          }
          const capabilityNames = capabilities
            .map((capability) => {
              const genericName = capability?.generic_service_capability?.name;
              const fallbackName =
                capability?.subscription_capability?.service_capability?.name;
              if (genericName === ServiceRestriction.Access) return null;
              return {
                id: genericName ?? fallbackName,
                name: genericName ?? fallbackName,
              };
            })
            .filter(Boolean);
          return (
            <BadgeOverflowCounter badges={capabilityNames as BadgeOverflow[]} />
          );
        },
      },
      {
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        size: 40,
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end">
              {canManageUserServices && (
                <IconActions
                  analyticsId="list_row_actions_open"
                  aria-label={t('Utils.OpenMenu')}
                  icon={
                    <MoreVertIcon className="h-4 w-4 text-icon-highlight" />
                  }>
                  <IconActionsItem
                    {...analyticsId('subscription_user_access_edit')}
                    onClick={() => setEditUserService(row.original)}>
                    {t('Utils.Update')}
                  </IconActionsItem>
                  <IconActionsItem
                    {...analyticsId('subscription_user_access_remove')}
                    onClick={() => setDeleteUserServices([row.original])}>
                    {t('Utils.Delete')}
                  </IconActionsItem>
                </IconActions>
              )}
            </div>
          );
        },
      },
    ],
    [canManageUserServices, t]
  );

  const toolbar = (
    <div className="flex justify-between flex-wrap gap-2 pt-2">
      <div className="flex gap-2 flex-wrap ml-auto">
        <SubscriptionSlugUserService
          subscription={queryDataSubscription}
          userServiceToEdit={editUserService}
          openEdit={!!editUserService}
          setOpenEdit={(open) =>
            setEditUserService(open ? editUserService : undefined)
          }
        />
        <DataTableHeadBarOptions />
      </div>
    </div>
  );

  // The manage page heads with its own service instance, which carries neither
  // tags nor capabilities; the admin page with the subscription's.
  const headerServiceInstance:
    ServiceInstanceWithCapabilitiesItemFragment | undefined = serviceInstance
    ? {
        id: serviceInstance.id,
        name: serviceInstance.name,
        description: serviceInstance.description,
        tags: null,
        service_definition: null,
      }
    : queryDataSubscription.subscriptionById?.service_instance;

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />

      {headerServiceInstance && (
        <ServiceSlugHeader serviceInstance={headerServiceInstance} />
      )}

      <DataTable
        {...getDataTableLabels(t)}
        toolbar={toolbar}
        columns={columns}
        data={userData}
        selectionOptions={
          canManageUserServices
            ? {
                selectionState: {
                  state: selection,
                  onSelectionChange: setSelection,
                },
                selectionHeader: {
                  actions: () => (
                    <>
                      <Button
                        {...analyticsId('subscription_bulk_capabilities_open')}
                        priority="tertiary"
                        startIcon={<AddIcon className="h-4 w-4" />}
                        onClick={() => setOpenAddCapabilities(true)}>
                        {t(
                          'Service.Management.AddUserServiceCapabilities.Button'
                        )}
                      </Button>
                      <Button
                        {...analyticsId('subscription_selected_access_remove')}
                        variant="destructive"
                        priority="tertiary"
                        startIcon={<DeleteIcon className="h-4 w-4" />}
                        onClick={() =>
                          setDeleteUserServices(selectedUserServices)
                        }>
                        {t('Utils.Delete')}
                      </Button>
                    </>
                  ),
                },
              }
            : undefined
        }
        tableOptions={{
          enableRowSelection: (row) =>
            canManageUserServices && !!row.original.id,
          onPaginationChange,
          manualPagination: true,
          rowCount: totalCount,
        }}
        tableState={{
          pagination,
          columnPinning: { right: ['actions'] },
        }}
      />
      {deleteUserServices && deleteUserServices.length > 0 && (
        <DeleteUserService
          userServices={deleteUserServices}
          isOpen={!!deleteUserServices}
          onDeleted={() => {
            setSelection(emptySelectionState);
          }}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteUserServices(undefined);
            }
          }}
        />
      )}
      <SubscriptionSlugAddCapabilities
        selectedUserServices={selectedUserServices}
        availableCapabilities={availableCapabilities}
        open={openAddCapabilities}
        setOpen={setOpenAddCapabilities}
        onCompleted={() => setSelection(emptySelectionState())}
        serviceInstanceId={headerServiceInstance?.id ?? ''}
      />
    </>
  );
};

const SubscriptionSlug = ({
  subscriptionId,
  serviceInstance,
}: SubscriptionSlugProps) => {
  const variables = useMemo(() => ({ subscriptionId }), [subscriptionId]);
  const { data } = useSubscriptionByIdQuery(portalGraphqlClient, variables, {
    queryKey: subscriptionKeys.byId(variables),
    throwOnError: throwOnFirstLoadError,
  });

  const [count, setCount] = useLocalStorage('countUserServices', 50);
  const [orderMode] = useLocalStorage(
    'orderModeUserServices',
    OrderingMode.Asc
  );
  const [orderBy] = useLocalStorage(
    'orderByUserServices',
    UserServiceOrdering.FirstName
  );
  // The users are read page by page, so each of them stays reachable once a
  // write invalidates the list, wherever the ordering puts them.
  const { pagination, cursor, onPaginationChange } = useTablePagination({
    pageSize: count,
    setPageSize: setCount,
  });
  const userServicesVariables = useMemo(
    () => ({
      subscriptionId,
      count: pagination.pageSize,
      cursor,
      orderBy,
      orderMode,
    }),
    [subscriptionId, pagination.pageSize, cursor, orderBy, orderMode]
  );
  const {
    data: userServicesData,
    isSuccess,
    isFetching,
    isPlaceholderData,
  } = useUserServicesFromSubscriptionQuery(
    portalGraphqlClient,
    userServicesVariables,
    {
      queryKey: userServicesKeys.list(userServicesVariables),
      // A page change keeps the users shown until the next page arrives.
      placeholderData: keepPreviousData,
      throwOnError: throwOnFirstLoadError,
    }
  );
  const userData = useMemo(
    () =>
      userServicesData?.userServiceFromSubscription?.edges.flatMap(
        ({ node }) => (node ? [node] : [])
      ) ?? [],
    [userServicesData]
  );
  const totalCount = userServicesData?.userServiceFromSubscription?.totalCount;
  if (
    isSuccess &&
    !isFetching &&
    !isPlaceholderData &&
    totalCount !== undefined
  ) {
    const lastPageIndex = Math.max(
      0,
      Math.ceil(totalCount / pagination.pageSize) - 1
    );
    if (pagination.pageIndex > lastPageIndex) {
      onPaginationChange({ ...pagination, pageIndex: lastPageIndex });
    }
  }

  if (!data || !userServicesData) {
    return <Loader />;
  }

  return (
    <SubscriptionSlugContent
      queryDataSubscription={data}
      userData={userData}
      totalCount={userServicesData.userServiceFromSubscription?.totalCount ?? 0}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      serviceInstance={serviceInstance}
    />
  );
};

export default SubscriptionSlug;
