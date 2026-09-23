import { UserServiceForm } from '@/components/service/[slug]/UserServiceForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/ui';
import { subscriptionByIdQuery$data } from '@generated/subscriptionByIdQuery.graphql';
import { userServices_fragment$data } from '@generated/userServices_fragment.graphql';
import { FunctionComponent, useState } from 'react';

interface SubscriptionSlugUserServiceProps {
  connectionId: string;
  subscription: subscriptionByIdQuery$data;
  userServiceToEdit?: userServices_fragment$data;
  openEdit?: boolean;
  setOpenEdit?: (open: boolean) => void;
}

export const SubscriptionSlugUserService: FunctionComponent<
  SubscriptionSlugUserServiceProps
> = ({
  connectionId,
  subscription,
  userServiceToEdit,
  openEdit,
  setOpenEdit,
}) => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);
  const isEditMode = !!userServiceToEdit;
  const sheetOpen = isEditMode ? (openEdit ?? false) : openSheet;
  const setSheetOpen = isEditMode
    ? (setOpenEdit ?? setOpenSheet)
    : setOpenSheet;

  return (
    <SheetWithPreventingDialog
      open={sheetOpen}
      setOpen={setSheetOpen}
      onOpenAutoFocus={(event) => {
        if (isEditMode) {
          return;
        }
        event.preventDefault();
      }}
      trigger={
        <Button>{t('Service.Management.InviteUser.TitleInviteUser')}</Button>
      }
      title={t('InviteUserServiceForm.Title', {
        serviceName: subscription.subscriptionById!.service_instance!.name,
      })}>
      <UserServiceForm
        connectionId={connectionId}
        userService={userServiceToEdit}
        subscription={subscription}
      />
    </SheetWithPreventingDialog>
  );
};
