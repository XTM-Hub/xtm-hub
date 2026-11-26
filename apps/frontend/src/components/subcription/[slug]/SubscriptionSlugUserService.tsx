import { UserServiceForm } from '@/components/service/[slug]/UserServiceForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';
import {
  SubscriptionByIdQuery,
  type UserServiceItemFragment,
} from '@graphql/generated';
import { FunctionComponent, useState } from 'react';

interface SubscriptionSlugUserServiceProps {
  subscription: SubscriptionByIdQuery;
  userServiceToEdit?: UserServiceItemFragment;
  openEdit?: boolean;
  setOpenEdit?: (open: boolean) => void;
}

export const SubscriptionSlugUserService: FunctionComponent<
  SubscriptionSlugUserServiceProps
> = ({ subscription, userServiceToEdit, openEdit, setOpenEdit }) => {
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
        <Button {...analyticsId('subscription_user_invite')}>
          {t('Service.Management.InviteUser.TitleInviteUser')}
        </Button>
      }
      title={t('InviteUserServiceForm.Title', {
        serviceName: subscription.subscriptionById!.service_instance!.name,
      })}>
      <UserServiceForm
        userService={userServiceToEdit}
        subscription={subscription}
      />
    </SheetWithPreventingDialog>
  );
};
