import ServiceSlugHeader from '@/components/service/[slug]/ServiceSlugHeader';
import {
  ServiceInstanceByIdQuery,
  serviceInstanceForSubscriptionsFragment,
} from '@/components/service/service.graphql';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import {
  BreadcrumbNav,
  BreadcrumbNavLink,
} from '@/components/ui/BreadcrumbNav';
import {
  IconActions,
  IconActionsItem,
  IconActionsLink,
} from '@/components/ui/IconActions';
import { SearchInput } from '@/components/ui/SearchInput';
import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { i18nKey } from '@/utils/datatable';
import { APP_PATH } from '@/utils/path/constant';
import { AddIcon, DeleteIcon, MoreVertIcon } from '@filigran/icon';
import {
  DataTable,
  DataTableHeadBarOptions,
  SelectionState,
  Switch,
} from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
import { serviceInstanceByIdQuery } from '@generated/serviceInstanceByIdQuery.graphql';
import { serviceInstanceForSubscriptions_fragment$key } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';
import { PreloadedQuery, readInlineData, usePreloadedQuery } from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';
import { ServiceSlugAddCapabilities } from './ServiceSlugAddCapabilities';
import { ServiceSlugDeleteSubscription } from './ServiceSlugDeleteSubscription';
import { ServiceSlugSubscription } from './ServiceSlugSubscription';

interface ServiceSlugProps {
  subscriptions: subscription_fragment$data[];
  queryRefServiceInstance: PreloadedQuery<serviceInstanceByIdQuery>;
  subscriptionConnectionId: string;
}

const emptySelectionState = (): SelectionState => ({
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
});

const ServiceSlug = ({
  subscriptions,
  queryRefServiceInstance,
  subscriptionConnectionId,
}: ServiceSlugProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const queryDataRequest = usePreloadedQuery<serviceInstanceByIdQuery>(
    ServiceInstanceByIdQuery,
    queryRefServiceInstance
  );
  const serviceInstanceRef = queryDataRequest.serviceInstanceById;

  if (!serviceInstanceRef) {
    return null;
  }

  const serviceInstance =
    readInlineData<serviceInstanceForSubscriptions_fragment$key>(
      serviceInstanceForSubscriptionsFragment,
      serviceInstanceRef
    );
  const [shouldDisplayPersonalSpaces, setShouldDisplayPersonalSpaces] =
    useState(false);
  const [deleteSubscriptions, setDeleteSubscriptions] = useState<
    subscription_fragment$data[] | undefined
  >(undefined);
  const [updateSubscription, setUpdateSubscription] = useState<
    subscription_fragment$data | undefined
  >(undefined);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAddCapabilities, setOpenAddCapabilities] = useState(false);
  const [selection, setSelection] =
    useState<SelectionState>(emptySelectionState);

  const t = useTranslate();

  const debounceHandleInput = useDebounceCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value),
    DEBOUNCE_TIME
  );

  const [pagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 500,
  });

  const isAdminPath = useAdminPath();

  const breadcrumbValue: BreadcrumbNavLink[] = [
    ...(isAdminPath
      ? [
          { label: 'MenuLinks.Home', href: `/${APP_PATH}` },
          { label: 'MenuLinks.Settings' },
          { label: 'MenuLinks.Service', href: `/${APP_PATH}/admin/service` },
        ]
      : [{ label: 'MenuLinks.Home', href: `/${APP_PATH}` }]),
    {
      label: serviceInstance.name,
      original: true,
    },
  ];

  const columns: ColumnDef<subscription_fragment$data>[] = [
    {
      accessorKey: 'organization.name',
      id: 'organizationName',
      header: 'Name',
    },
    {
      id: 'capabilities',
      header: 'Capabilities',
      cell: ({ row }) => {
        const subscriptionCapabilities: BadgeOverflow[] = (
          row.original.subscription_capability ?? []
        ).flatMap((subscriptionCapability) => {
          const capability = subscriptionCapability?.service_capability;
          if (!capability?.id || !capability.name) {
            return [];
          }

          return [
            {
              id: capability.id,
              name: capability.name,
            },
          ];
        });

        return <BadgeOverflowCounter badges={subscriptionCapabilities} />;
      },
    },
    {
      id: 'actions',
      size: 40,
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end">
            <IconActions
              icon={
                <>
                  <MoreVertIcon className="h-4 w-4 text-primary" />
                  <span className="sr-only">{t('Utils.OpenMenu')}</span>
                </>
              }>
              <IconActionsLink
                href={`/${APP_PATH}/admin/service/${row.id}/subscription`}>
                {t('Service.Management.ManageUsers')}
              </IconActionsLink>
              <IconActionsItem
                onClick={() => {
                  setUpdateSubscription(row.original);
                  setOpenEdit(true);
                }}>
                {t('Utils.Edit')}
              </IconActionsItem>
              <IconActionsItem
                onClick={() => setDeleteSubscriptions([row.original])}>
                {t('Utils.Delete')}
              </IconActionsItem>
            </IconActions>
          </div>
        );
      },
    },
  ];

  const toolbar = (
    <div className="flex justify-between flex-wrap gap-s pt-s">
      <div className="flex items-center gap-m ml-l">
        <div className="flex-1 max-w-sm">
          <SearchInput
            id="SearchTerm"
            placeholder={t('Service.Management.SearchOrganization')}
            onChange={debounceHandleInput}
          />
        </div>
        <div className="flex items-center">
          <Switch
            checked={shouldDisplayPersonalSpaces}
            onCheckedChange={(value) => setShouldDisplayPersonalSpaces(value)}
            id="displayPersonalSpaces"
          />
          <label
            htmlFor="displayPersonalSpaces"
            className="ml-s">
            {t('Service.Management.ShowPersonalSpaces')}
          </label>
        </div>
      </div>

      <div className="flex gap-s flex-wrap ml-auto">
        <ServiceSlugSubscription
          subscriptions={subscriptions}
          subscriptionToEdit={updateSubscription}
          serviceInstance={serviceInstance}
          subscriptionConnectionId={subscriptionConnectionId}
          openEdit={openEdit}
          setOpenEdit={(open) => {
            setOpenEdit(open);
            if (!open) setUpdateSubscription(undefined);
          }}
        />
        <DataTableHeadBarOptions />
      </div>
    </div>
  );

  const filteredAndSortedData = useMemo(() => {
    const filteredBySpace = subscriptions.filter(
      (subscription) =>
        subscription?.organization?.personal_space ===
        shouldDisplayPersonalSpaces
    );

    return searchTerm
      ? filteredBySpace.filter((subscription) => {
          const orgName = subscription?.organization?.name;
          return orgName?.toLowerCase().includes(searchTerm.toLowerCase());
        })
      : filteredBySpace;
  }, [subscriptions, shouldDisplayPersonalSpaces, searchTerm]);

  const selectedSubscriptions = useMemo(() => {
    if (selection.selectAll) {
      return filteredAndSortedData.filter(
        (subscription) => !selection.excludedIds.has(subscription.id)
      );
    }

    return filteredAndSortedData.filter((subscription) =>
      selection.selectedIds.has(subscription.id)
    );
  }, [filteredAndSortedData, selection]);

  const availableCapabilities: BadgeOverflow[] = useMemo(
    () =>
      (serviceInstance.service_definition?.service_capability ?? []).flatMap(
        (capability) => {
          if (!capability?.id || !capability.name) {
            return [];
          }

          return [
            {
              id: capability.id,
              name: capability.name,
            },
          ];
        }
      ),
    [serviceInstance.service_definition?.service_capability]
  );

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />

      <div>
        <ServiceSlugHeader serviceInstance={serviceInstance} />
        <div className="border rounded bg-elevation-background-layer-1 p-m">
          <h2 className="">{t('Service.Management.Description') + ':'}</h2>

          <DataTable
            i18nKey={i18nKey(t)}
            columns={columns}
            data={filteredAndSortedData}
            toolbar={toolbar}
            selectionOptions={{
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
                        'Service.Management.AddSubscriptionCapabilities.Button'
                      )}
                    </Button>
                    <Button
                      variant="tertiary-destructive"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() =>
                        setDeleteSubscriptions(selectedSubscriptions)
                      }>
                      <DeleteIcon className="h-4 w-4 m-s" />
                      {t('Utils.Delete')}
                    </Button>
                  </>
                ),
              },
            }}
            tableOptions={{
              enableRowSelection: (row) => !!row.original.id,
            }}
            tableState={{
              pagination,
              columnPinning: { right: ['actions'] },
            }}
          />
        </div>
      </div>

      {deleteSubscriptions && deleteSubscriptions.length > 0 && (
        <ServiceSlugDeleteSubscription
          subscriptions={deleteSubscriptions}
          subscriptionConnectionId={subscriptionConnectionId}
          onDeleted={() => {
            setSelection(emptySelectionState);
          }}
          open={!!deleteSubscriptions}
          setOpen={(open) =>
            setDeleteSubscriptions(open ? deleteSubscriptions : undefined)
          }
        />
      )}
      <ServiceSlugAddCapabilities
        selectedSubscriptions={selectedSubscriptions}
        availableCapabilities={availableCapabilities}
        open={openAddCapabilities}
        setOpen={setOpenAddCapabilities}
        onCompleted={() => setSelection(emptySelectionState())}
      />
    </>
  );
};

export default ServiceSlug;
