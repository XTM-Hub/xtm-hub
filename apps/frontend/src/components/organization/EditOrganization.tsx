import { OrganizationEditMutation } from '@/components/organization/organization.graphql';
import { OrganizationForm } from '@/components/organization/OrganizationForm';
import { organizationFormSchema } from '@/components/organization/OrganizationForm.schema';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { organizationEditMutation } from '@generated/organizationEditMutation.graphql';
import { organizationItem_fragment$data } from '@generated/organizationItem_fragment.graphql';
import { useMutation } from 'react-relay';
import { z } from 'zod';

interface EditOrganizationProps {
  organization: organizationItem_fragment$data;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const EditOrganization = ({
  organization,
  open,
  setOpen,
}: EditOrganizationProps) => {
  const t = useTranslate();
  const [commitOrganizationEditionMutation] =
    useMutation<organizationEditMutation>(OrganizationEditMutation);

  const handleSubmit = (values: z.infer<typeof organizationFormSchema>) => {
    commitOrganizationEditionMutation({
      variables: {
        id: organization.id,
        input: {
          ...values,
        },
      },

      onCompleted: () => {
        setOpen(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('OrganizationActions.OrganizationUpdated', {
            name: values.name,
          }),
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
  };
  return (
    <SheetWithPreventingDialog
      open={open}
      setOpen={setOpen}
      title={t('OrganizationForm.EditOrganization')}>
      <OrganizationForm
        organization={organization}
        handleSubmit={handleSubmit}
      />
    </SheetWithPreventingDialog>
  );
};
