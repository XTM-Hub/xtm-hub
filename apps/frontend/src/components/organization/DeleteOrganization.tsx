import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrganizationItemFragment,
  useOrganizationDeleteMutation,
} from '@graphql/generated';
import { organizationKeys } from '@graphql/organization/organization.keys';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteOrganizationProps {
  organization: OrganizationItemFragment;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DeleteOrganization = ({
  organization,
  open,
  setOpen,
}: DeleteOrganizationProps) => {
  const queryClient = useQueryClient();
  const t = useTranslate();
  const { mutate: deleteOrganization, isPending } =
    useOrganizationDeleteMutation(portalGraphqlClient, {
      onSuccess: async () => {
        setOpen(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('OrganizationActions.OrganizationDeleted'),
        });
        await queryClient.invalidateQueries({
          queryKey: organizationKeys.all(),
        });
      },
      onError: (error: unknown) => {
        setOpen(false);
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    });

  return (
    <ConfirmDialog
      confirmLabel={t('Utils.Delete')}
      destructive
      title={t('OrganizationForm.DeleteOrganization')}
      open={open}
      onOpenChange={setOpen}
      onConfirm={(event) => {
        // Closing would unmount the dialog: the callbacks close it once the deletion settles.
        event.preventDefault();
        deleteOrganization({ id: organization.id });
      }}
      confirmDisabled={isPending}>
      {t('OrganizationForm.SureDeleteOrganization', {
        organizationName: organization.name,
      })}
    </ConfirmDialog>
  );
};
