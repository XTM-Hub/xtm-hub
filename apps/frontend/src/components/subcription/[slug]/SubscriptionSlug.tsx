import {
  UserServiceFromSubscription,
  userServiceFromSubscriptionFragment,
  userServicesFragment,
} from '@/components/service/user_service.graphql';
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
import { userServiceFromSubscription$key } from '@generated/userServiceFromSubscription.graphql';
import {
  userServices_fragment$data,
  userServices_fragment$key,
} from '@generated/userServices_fragment.graphql';
import {
  OrganizationCapability,
  ServiceRestriction,
  SubscriptionByIdQuery,
  useSubscriptionByIdQuery,
} from '@graphql/generated';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { ColumnDef, PaginationState } from '@tanstack/react-table';

import { useCallback, useContext, useMemo, useState } from 'react';

import { DeleteUserService } from '@/components/subcription/[slug]/DeleteUserService';
import { SubscriptionSlugUserService } from '@/components/subcription/[slug]/SubscriptionSlugUserService';
import {
  BreadcrumbNav,
  BreadcrumbNavLink,
} from '@/components/ui/BreadcrumbNav';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import {
  PreloadedQuery,
  readInlineData,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';

import Loader from '@/components/Loader';
import { PortalContext } from '@/components/me/AppPortalContext';
import ServiceSlugHeader from '@/components/service/[slug]/ServiceSlugHeader';
import { SubscriptionSlugAddCapabilities } from '@/components/subcription/[slug]/SubscriptionSlugAddCapabilities';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { ADMIN_SERVICE_CATALOG_PATH, APP_PATH } from '@/utils/path/constant';
import { Button } from '@filigran/design-system';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { userServiceFromSubscriptionQuery } from '@generated/userServiceFromSubscriptionQuery.graphql';
import { notFound } from 'next/navigation';

interface SubscriptionSlugProps {
  queryRef: PreloadedQuery<userServiceFromSubscriptionQuery>;
  subscriptionId: string;
  serviceInstance?: serviceInstance_fragment$data;
}

interface SubscriptionSlugContentProps {
  queryRef: PreloadedQuery<userServiceFromSubscriptionQuery>;
  queryDataSubscription: SubscriptionByIdQuery;
  serviceInstance?: serviceInstance_fragment$data;
}

const emptySelectionState = (): SelectionState => ({
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
});

const SubscriptionSlugContent = ({
  queryRef,
  queryDataSubscription,
  serviceInstance,
}: SubscriptionSlugContentProps) => {
  const t = useTranslate();
  const [editUserService, setEditUserService] = useState<
    userServices_fragment$data | undefined
  >(undefined);
  const [deleteUserServices, setDeleteUserServices] = useState<
    userServices_fragment$data[] | undefined
  >(undefined);
  const [openAddCapabilities, setOpenAddCapabilities] = useState(false);
  const [selection, setSelection] =
    useState<SelectionState>(emptySelectionState);

  const { me, hasOrganizationCapability } = useContext(PortalContext);

  const queryData = usePreloadedQuery<userServiceFromSubscriptionQuery>(
    UserServiceFromSubscription,
    queryRef
  );

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

  const [userServices] = useRefetchableFragment<
    userServiceFromSubscriptionQuery,
    userServiceFromSubscription$key
  >(userServiceFromSubscriptionFragment, queryData);

  const userData: userServices_fragment$data[] = (
    userServices.userServiceFromSubscription?.edges ?? []
  )
    .map(({ node }) =>
      readInlineData<userServices_fragment$key>(userServicesFragment, node)
    )
    .filter((data) => !!data);

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

  const columns: ColumnDef<userServices_fragment$data>[] = useMemo(
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
          connectionId={userServices.userServiceFromSubscription?.__id ?? ''}
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

  const headerServiceInstance =
    serviceInstance ?? queryDataSubscription.subscriptionById?.service_instance;

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />

      {headerServiceInstance && (
        <ServiceSlugHeader
          serviceInstance={
            headerServiceInstance as unknown as serviceInstanceForSubscriptions_fragment$data
          }
        />
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
          connectionId={userServices.userServiceFromSubscription?.__id ?? ''}
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
  queryRef,
  subscriptionId,
  serviceInstance,
}: SubscriptionSlugProps) => {
  const variables = useMemo(() => ({ subscriptionId }), [subscriptionId]);
  const { data } = useSubscriptionByIdQuery(portalGraphqlClient, variables, {
    queryKey: subscriptionKeys.byId(variables),
    // A failed first load reaches the error page; a failed background refetch keeps the data shown.
    throwOnError: (_error, query) => query.state.data === undefined,
  });

  if (!data) {
    return <Loader />;
  }

  return (
    <SubscriptionSlugContent
      queryRef={queryRef}
      queryDataSubscription={data}
      serviceInstance={serviceInstance}
    />
  );
};

export default SubscriptionSlug;
