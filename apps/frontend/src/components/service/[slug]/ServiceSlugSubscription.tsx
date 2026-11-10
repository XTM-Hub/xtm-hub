import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { SubscriptionItemFragment } from '@graphql/generated';
import { FunctionComponent, useState } from 'react';
import { ServiceSlugOrgaForm } from './ServiceSlugOrgaForm';

interface ServiceSlugAddSubscriptionActionProps {
  serviceInstance: serviceInstanceForSubscriptions_fragment$data;
  subscriptions: SubscriptionItemFragment[];
  subscriptionToEdit?: SubscriptionItemFragment;
  openEdit?: boolean;
  setOpenEdit?: (open: boolean) => void;
}

export const ServiceSlugSubscription: FunctionComponent<
  ServiceSlugAddSubscriptionActionProps
> = ({
  serviceInstance,
  subscriptions,
  subscriptionToEdit,
  openEdit,
  setOpenEdit,
}) => {
  const [openSheetAddOrga, setOpenSheetAddOrga] = useState(false);
  const t = useTranslate();
  const isAdminPath = useAdminPath();

  if (!isAdminPath || !serviceInstance) {
    return null;
  }
  const isEditMode = !!subscriptionToEdit;
  const sheetOpen = isEditMode ? (openEdit ?? false) : openSheetAddOrga;
  const setSheetOpen = isEditMode
    ? (setOpenEdit ?? setOpenSheetAddOrga)
    : setOpenSheetAddOrga;

  return (
    <SheetWithPreventingDialog
      open={sheetOpen}
      setOpen={setSheetOpen}
      trigger={
        <Button {...analyticsId('admin_subscription_create')}>
          {t('Service.SubscribeOrganization')}
        </Button>
      }
      title={
        t('OrganizationInServiceAction.AddOrganization') +
        ' ' +
        serviceInstance.name
      }>
      <ServiceSlugOrgaForm
        subscriptions={subscriptions}
        serviceInstance={serviceInstance}
        subscriptionToEdit={subscriptionToEdit}
      />
    </SheetWithPreventingDialog>
  );
};
