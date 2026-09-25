import { getDeletionBlockedReasonKey } from '@/components/admin/user/delete-user.utils';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { DialogInformative } from '@/components/ui/Dialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useToast } from '@filigran/ui';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { useUserDeleteMutation } from '@graphql/generated';
import React, { useState } from 'react';

interface DeleteUserProps {
  user: UserList_fragment$data;
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
  const { toast } = useToast();
  const [blockedReasonKey, setBlockedReasonKey] = useState<string | null>(null);
  const { mutate: deleteUserMutation } = useUserDeleteMutation(
    portalGraphqlClient,
    {
      onSuccess: () => {
        toast({
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
        toast({
          variant: 'destructive',
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
    <AlertDialogComponent
      actionButtonText={t('Utils.Delete')}
      variantName={'destructive'}
      AlertTitle={t('UserActions.DeleteUser')}
      isOpen={open}
      onOpenChange={setOpen}
      onClickContinue={onDeleteUser}>
      {t('UserActions.SureDeleteUser', { email: user.email })}
    </AlertDialogComponent>
  );
};
