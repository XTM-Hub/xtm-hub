import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { toast } from '@filigran/ui';
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
        toast({
          title: t('Utils.Success'),
        });
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UnknownError';
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    }
  );

  return (
    <AlertDialogComponent
      isOpen={open}
      onOpenChange={onOpenChange}
      AlertTitle={t('RoleListPage.DeleteRoleDialog.Title')}
      actionButtonText={t('Utils.Delete')}
      variantName="destructive"
      onClickContinue={() => deleteRolePortal({ name: rolePortal })}
      continueButtonDisabled={isPending}>
      {t('RoleListPage.DeleteRoleDialog.Text', { rolePortal })}
    </AlertDialogComponent>
  );
};

export default DeleteRolePortal;
