import { CreateOrganizationMutation } from '@/components/organization/organization.graphql';
import { OrganizationForm } from '@/components/organization/OrganizationForm';
import { organizationFormSchema } from '@/components/organization/OrganizationForm.schema';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { organizationCreateMutation } from '@generated/organizationCreateMutation.graphql';
import { useState } from 'react';
import { useMutation } from 'react-relay';
import { z } from 'zod';

interface CreateOrganizationProps {
  connectionId: string;
}

export const CreateOrganization = ({
  connectionId,
}: CreateOrganizationProps) => {
  const t = useTranslate();
  const [commitOrganizationCreationMutation] =
    useMutation<organizationCreateMutation>(CreateOrganizationMutation);
  const [openSheet, setOpenSheet] = useState(false);

  const handleSubmit = (values: z.infer<typeof organizationFormSchema>) => {
    commitOrganizationCreationMutation({
      variables: {
        connections: [connectionId],
        input: { ...values },
      },

      onCompleted: ({ addOrganization }) => {
        if (!addOrganization) {
          return;
        }
        setOpenSheet(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('OrganizationActions.OrganizationCreated', {
            name: values.name,
          }),
        });
      },
      onError: (error) => {
        const message =
          error.message === 'ORGANIZATION_SAME_NAME_EXISTS'
            ? t('OrganizationActions.ErrorNameAlreadyExists', {
                name: values.name,
              })
            : t(`Error.Server.${error.message}`);
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{message}</>,
        });
      },
    });
  };
  return (
    <SheetWithPreventingDialog
      open={openSheet}
      setOpen={setOpenSheet}
      trigger={
        <Button className="truncate inline-block ">
          {t('OrganizationForm.CreateOrganization')}
        </Button>
      }
      title={t('OrganizationForm.CreateOrganization')}>
      <OrganizationForm handleSubmit={handleSubmit} />
    </SheetWithPreventingDialog>
  );
};
