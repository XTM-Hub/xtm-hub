import { organizationDeletion } from '@/components/organization/organization.graphql';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { organizationDeletionMutation } from '@generated/organizationDeletionMutation.graphql';
import { organizationItem_fragment$data } from '@generated/organizationItem_fragment.graphql';
import { useMutation } from 'react-relay';

interface DeleteOrganizationProps {
  organization: organizationItem_fragment$data;
  connectionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DeleteOrganization = ({
  organization,
  connectionId,
  open,
  setOpen,
}: DeleteOrganizationProps) => {
  const [deleteOrganizationMutation] =
    useMutation<organizationDeletionMutation>(organizationDeletion);
  const t = useTranslate();
  const onDeletedOrganization = (deletedOrganizationId: string) => {
    deleteOrganizationMutation({
      variables: { id: deletedOrganizationId, connections: [connectionId] },
      onCompleted: () => {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('OrganizationActions.OrganizationDeleted'),
        });
      },
      onError: (error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${error.message}`)}</>,
        });
      },
    });
  };
  return (
    <ConfirmDialog
      confirmLabel={t('Utils.Delete')}
      destructive
      title={t('OrganizationForm.DeleteOrganization')}
      open={open}
      onOpenChange={setOpen}
      onConfirm={() => onDeletedOrganization(organization.id)}>
      {t('OrganizationForm.SureDeleteOrganization', {
        organizationName: organization.name,
      })}
    </ConfirmDialog>
  );
};
