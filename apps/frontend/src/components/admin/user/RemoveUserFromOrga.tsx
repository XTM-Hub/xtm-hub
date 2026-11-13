import { useRefreshUsersList } from '@/components/admin/user/use-refresh-users-list';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { PortalContext } from '@/components/me/AppPortalContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import { useUserOrganizationRemoveMutation } from '@graphql/generated';
import { useContext } from 'react';

interface RemoveUserFromOrgaProps {
  user: UsersListUser;
}

export const RemoveUserFromOrga = ({ user }: RemoveUserFromOrgaProps) => {
  const { me } = useContext(PortalContext);
  const refreshUsersList = useRefreshUsersList();
  const { setOpenSheet } = useDialogContext();
  const t = useTranslate();
  const { mutate: removeUserMutation } =
    useUserOrganizationRemoveMutation<Error>(portalGraphqlClient, {
      // On the hook, not on mutate: like Relay, the outcome is handled even if
      // the form is gone by then.
      onSuccess: () => {
        refreshUsersList();
        setOpenSheet(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('UserActions.UserRemoved', { email: user.email }),
        });
      },
      onError: (error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  const onRemoveUser = (user_id: string): void => {
    removeUserMutation({
      user_id,
      organization_id: me!.selected_organization_id,
    });
  };

  const trigger = (
    <Button
      variant="destructive"
      priority="secondary"
      {...analyticsId('organization_member_remove')}>
      {t('MenuActions.Remove')}
    </Button>
  );

  return (
    <ConfirmDialog
      confirmAnalyticsId="organization_member_removal_confirm"
      title={t('UserActions.RemoveUser')}
      confirmLabel={t('MenuActions.Remove')}
      destructive
      trigger={trigger}
      onConfirm={() => onRemoveUser(user.id)}>
      {t('RemoveUserOrgDialog.TextRemoveThisUser', {
        email: user.email,
      })}
    </ConfirmDialog>
  );
};
