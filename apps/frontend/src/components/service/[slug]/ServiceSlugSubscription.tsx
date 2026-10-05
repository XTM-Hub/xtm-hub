import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/ui';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { FunctionComponent, useState } from 'react';
import { ServiceSlugOrgaForm } from './ServiceSlugOrgaForm';

interface ServiceSlugAddSubscriptionActionProps {
  serviceInstance: serviceInstanceForSubscriptions_fragment$data;
  subscriptions: subscription_fragment$data[];
  subscriptionConnectionId: string;
  subscriptionToEdit?: subscription_fragment$data;
  openEdit?: boolean;
  setOpenEdit?: (open: boolean) => void;
}

export const ServiceSlugSubscription: FunctionComponent<
  ServiceSlugAddSubscriptionActionProps
> = ({
  serviceInstance,
  subscriptions,
  subscriptionConnectionId,
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
      trigger={<Button>{t('Service.SubscribeOrganization')}</Button>}
      title={
        t('OrganizationInServiceAction.AddOrganization') +
        ' ' +
        serviceInstance.name
      }>
      <ServiceSlugOrgaForm
        subscriptions={subscriptions}
        subscriptionConnectionId={subscriptionConnectionId}
        serviceInstance={serviceInstance}
        subscriptionToEdit={subscriptionToEdit}
      />
    </SheetWithPreventingDialog>
  );
};
