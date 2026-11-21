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
import { Chip } from '@filigran/design-system';
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
  useSubscriptionByIdQuery,
  useUserServicesFromSubscriptionQuery,
} from '@graphql/generated';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { userServicesKeys } from '@graphql/user-service/user-service.keys';
import { ColumnDef, PaginationState } from '@tanstack/react-table';

import { useCallback, useContext, useMemo, useState } from 'react';

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
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { ADMIN_SERVICE_CATALOG_PATH, APP_PATH } from '@/utils/path/constant';
import { Button } from '@filigran/design-system';
import { notFound } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';

interface SubscriptionSlugProps {
  subscriptionId: string;
  serviceInstance?: ServiceInstanceItemFragment;
}

interface SubscriptionSlugContentProps {
  queryDataSubscription: SubscriptionByIdQuery;
  userData: UserServiceItemFragment[];
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

  const { me, hasOrganizationCapability } = useContext(PortalContext);

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

  const canManageService = useCallback(() => {
    return userData.some((userService) => {
      return (
        (userService.user?.id === me?.id &&
          userService.user_service_capability?.some(
            (user_service_capa) =>
              user_service_capa?.generic_service_capability?.name ===
              ServiceRestriction.ManageAccess
          )) ||
        (hasOrganizationCapability &&
          (hasOrganizationCapability(
            OrganizationCapability.AdministrateOrganization
          ) ||
            hasOrganizationCapability(
              OrganizationCapability.ManageSubscription
            )))
      );
    });
  }, [userData, me?.id, hasOrganizationCapability]);

  const isBypass = useAdminByPass();

  const canManageUserServices = isBypass || canManageService();

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

  const [pagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 500,
  });

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

  const [count] = useLocalStorage('countUserServices', 50);
  const [orderMode] = useLocalStorage(
    'orderModeUserServices',
    OrderingMode.Asc
  );
  const [orderBy] = useLocalStorage(
    'orderByUserServices',
    UserServiceOrdering.FirstName
  );
  const userServicesVariables = useMemo(
    () => ({ subscriptionId, count, orderBy, orderMode }),
    [subscriptionId, count, orderBy, orderMode]
  );
  const { data: userServicesData } = useUserServicesFromSubscriptionQuery(
    portalGraphqlClient,
    userServicesVariables,
    {
      queryKey: userServicesKeys.list(userServicesVariables),
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

  if (!data || !userServicesData) {
    return <Loader />;
  }

  return (
    <SubscriptionSlugContent
      queryDataSubscription={data}
      userData={userData}
      serviceInstance={serviceInstance}
    />
  );
};

export default SubscriptionSlug;
