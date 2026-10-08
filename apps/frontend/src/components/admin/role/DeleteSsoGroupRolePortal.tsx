import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  useDeleteSsoGroupRolePortalMutation,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteSsoGroupRolePortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ssoGroup: string;
  rolePortal: string;
}

const DeleteSsoGroupRolePortal = ({
  open,
  onOpenChange,
  ssoGroup,
  rolePortal,
}: DeleteSsoGroupRolePortalProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { mutate: deleteSsoGroupRolePortal, isPending } =
    useDeleteSsoGroupRolePortalMutation(portalGraphqlClient, {
      onSuccess: async () => {
        onOpenChange(false);
        await queryClient.invalidateQueries({
          queryKey: useSsoGroupRolePortalsQuery.getKey(),
        });
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
        });
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    });

  return (
    <AlertDialogComponent
      isOpen={open}
      onOpenChange={onOpenChange}
      AlertTitle={t('RoleListPage.DeleteDialog.Title')}
      actionButtonText={t('Utils.Delete')}
      variantName="destructive"
      onClickContinue={() =>
        deleteSsoGroupRolePortal({ input: { ssoGroup, rolePortal } })
      }
      continueButtonDisabled={isPending}>
      {t('RoleListPage.DeleteDialog.Text', { ssoGroup, rolePortal })}
    </AlertDialogComponent>
  );
};

export default DeleteSsoGroupRolePortal;
