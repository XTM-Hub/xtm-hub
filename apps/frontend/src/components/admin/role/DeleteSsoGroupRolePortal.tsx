import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { toast } from '@filigran/ui';
import {
  useDeleteSsoGroupRolePortalMutation,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { mutate: deleteSsoGroupRolePortal, isPending } =
    useDeleteSsoGroupRolePortalMutation(portalGraphqlClient, {
      onSuccess: async () => {
        onOpenChange(false);
        await queryClient.invalidateQueries({
          queryKey: useSsoGroupRolePortalsQuery.getKey(),
        });
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
