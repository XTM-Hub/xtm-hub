import {
  UserServiceFromSubscription,
  userServiceFromSubscriptionFragment,
  userServicesFragment,
} from '@/components/service/user_service.graphql';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { useTranslate } from '@/hooks/use-translate';
import { AddIcon, DeleteIcon, MoreVertIcon } from '@filigran/icon';
import {
  Badge,
  Button,
  DataTable,
  DataTableHeadBarOptions,
  SelectionState,
} from '@filigran/ui';
import { userServiceFromSubscription$key } from '@generated/userServiceFromSubscription.graphql';
import {
  userServices_fragment$data,
  userServices_fragment$key,
} from '@generated/userServices_fragment.graphql';
import { OrganizationCapability, ServiceRestriction } from '@graphql/generated';
import { ColumnDef, PaginationState } from '@tanstack/react-table';

import { useCallback, useContext, useMemo, useState } from 'react';

import { DeleteUserService } from '@/components/subcription/[slug]/DeleteUserService';
import { SubscriptionSlugUserService } from '@/components/subcription/[slug]/SubscriptionSlugUserService';
import { SubscriptionById } from '@/components/subcription/subscription.graphql';
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

import { PortalContext } from '@/components/me/AppPortalContext';
import ServiceSlugHeader from '@/components/service/[slug]/ServiceSlugHeader';
import { SubscriptionSlugAddCapabilities } from '@/components/subcription/[slug]/SubscriptionSlugAddCapabilities';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import { APP_PATH } from '@/utils/path/constant';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { subscriptionByIdQuery } from '@generated/subscriptionByIdQuery.graphql';
import { userServiceFromSubscriptionQuery } from '@generated/userServiceFromSubscriptionQuery.graphql';

interface SubscriptionSlugProps {
  queryRef: PreloadedQuery<userServiceFromSubscriptionQuery>;
  queryRefSubscription: PreloadedQuery<subscriptionByIdQuery>;
  serviceInstance?: serviceInstance_fragment$data;
}

const emptySelectionState = (): SelectionState => ({
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
});

const SubscriptionSlug = ({
  queryRef,
  queryRefSubscription,
  serviceInstance,
}: SubscriptionSlugProps) => {
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

  const queryDataSubscription = usePreloadedQuery<subscriptionByIdQuery>(
    SubscriptionById,
    queryRefSubscription
  );
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
      { label: 'MenuLinks.Service', href: `/${APP_PATH}/admin/service` },
      {
        label: queryDataSubscription.subscriptionById!.service_instance!.name,
        href: `/${APP_PATH}/admin/service/${queryDataSubscription.subscriptionById?.service_instance?.id}`,
        original: true,
      },
      {
        label: queryDataSubscription.subscriptionById!.organization.name,
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
            return (
              <Badge className="capitalize">{ServiceRestriction.Access}</Badge>
            );
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
                  icon={
                    <>
                      <MoreVertIcon className="h-4 w-4 text-primary" />
                      <span className="sr-only">{t('Utils.OpenMenu')}</span>
                    </>
                  }>
                  <IconActionsItem
                    onClick={() => setEditUserService(row.original)}>
                    {t('Utils.Update')}
                  </IconActionsItem>
                  <IconActionsItem
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
    <div className="flex justify-between flex-wrap gap-s pt-s">
      <div className="flex gap-s flex-wrap ml-auto">
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
                        variant="tertiary"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setOpenAddCapabilities(true)}>
                        <AddIcon className="h-4 w-4 m-s" />
                        {t(
                          'Service.Management.AddUserServiceCapabilities.Button'
                        )}
                      </Button>
                      <Button
                        variant="tertiary-destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() =>
                          setDeleteUserServices(selectedUserServices)
                        }>
                        <DeleteIcon className="h-4 w-4 m-s" />
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
export default SubscriptionSlug;
