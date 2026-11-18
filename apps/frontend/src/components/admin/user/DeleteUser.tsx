import { getDeletionBlockedReasonKey } from '@/components/admin/user/delete-user.utils';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DialogInformative } from '@/components/ui/Dialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useUserDeleteMutation } from '@graphql/generated';
import React, { useState } from 'react';

interface DeleteUserProps {
  user: UsersListUser;
  onUserDeleted: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DeleteUser = ({
  user,
  onUserDeleted,
  open,
  setOpen,
}: DeleteUserProps) => {
  const t = useTranslate();
  const [blockedReasonKey, setBlockedReasonKey] = useState<string | null>(null);
  const { mutate: deleteUserMutation } = useUserDeleteMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('UserActions.UserDeleted', { email: user.email }),
        });
        onUserDeleted();
        setOpen(false);
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        const reasonKey = getDeletionBlockedReasonKey(errorMessage);
        if (reasonKey) {
          setBlockedReasonKey(reasonKey);
          return;
        }
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${errorMessage}`),
        });
        setOpen(false);
      },
    }
  );

  const onDeleteUser = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    deleteUserMutation({ id: user.id });
  };

  return blockedReasonKey ? (
    <DialogInformative
      analyticsId="admin_user_deletion_notice_close"
      isOpen={true}
      onClose={() => {
        setBlockedReasonKey(null);
        setOpen(false);
      }}
      title={t('UserActions.DeletionBlocked')}
      description={t(blockedReasonKey)}>
      {null}
    </DialogInformative>
  ) : (
    <ConfirmDialog
      confirmAnalyticsId="admin_user_deletion_confirm"
      confirmLabel={t('Utils.Delete')}
      destructive
      title={t('UserActions.DeleteUser')}
      open={open}
      onOpenChange={setOpen}
      onConfirm={onDeleteUser}>
      {t('UserActions.SureDeleteUser', { email: user.email })}
    </ConfirmDialog>
  );
};
