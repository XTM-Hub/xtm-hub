import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('RoleListPage.DeleteDialog.Title')}
      confirmLabel={t('Utils.Delete')}
      destructive
      onConfirm={() =>
        deleteSsoGroupRolePortal({ input: { ssoGroup, rolePortal } })
      }
      confirmDisabled={isPending}>
      {t('RoleListPage.DeleteDialog.Text', { ssoGroup, rolePortal })}
    </ConfirmDialog>
  );
};

export default DeleteSsoGroupRolePortal;
