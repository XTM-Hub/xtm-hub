import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  useDeleteRolePortalMutation,
  useRolePortalsQuery,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteRolePortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rolePortal: string;
}

const DeleteRolePortal = ({
  open,
  onOpenChange,
  rolePortal,
}: DeleteRolePortalProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { mutate: deleteRolePortal, isPending } = useDeleteRolePortalMutation(
    portalGraphqlClient,
    {
      onSuccess: async () => {
        onOpenChange(false);
        // Deleting a role cascades to its SSO group mappings.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: useRolePortalsQuery.getKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: useSsoGroupRolePortalsQuery.getKey(),
          }),
        ]);
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
    }
  );

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('RoleListPage.DeleteRoleDialog.Title')}
      confirmLabel={t('Utils.Delete')}
      destructive
      onConfirm={() => deleteRolePortal({ name: rolePortal })}
      confirmDisabled={isPending}>
      {t('RoleListPage.DeleteRoleDialog.Text', { rolePortal })}
    </ConfirmDialog>
  );
};

export default DeleteRolePortal;
