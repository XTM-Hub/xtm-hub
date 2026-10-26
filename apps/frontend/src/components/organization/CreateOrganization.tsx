import { OrganizationForm } from '@/components/organization/OrganizationForm';
import { organizationFormSchema } from '@/components/organization/OrganizationForm.schema';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import { useOrganizationCreateMutation } from '@graphql/generated';
import { organizationKeys } from '@graphql/organization/organization.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

export const CreateOrganization = () => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [openSheet, setOpenSheet] = useState(false);
  const { mutate: createOrganization, isPending } =
    useOrganizationCreateMutation(portalGraphqlClient, {
      onSuccess: async ({ addOrganization }, { input }) => {
        if (!addOrganization) {
          return;
        }
        setOpenSheet(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('OrganizationActions.OrganizationCreated', {
            name: input.name,
          }),
        });
        await queryClient.invalidateQueries({
          queryKey: organizationKeys.all(),
        });
      },
      onError: (error: unknown, { input }) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        const message =
          errorMessage === 'ORGANIZATION_SAME_NAME_EXISTS'
            ? t('OrganizationActions.ErrorNameAlreadyExists', {
                name: input.name,
              })
            : t(`Error.Server.${errorMessage}`);
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{message}</>,
        });
      },
    });

  const handleSubmit = (values: z.infer<typeof organizationFormSchema>) => {
    createOrganization({ input: { ...values } });
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
      <OrganizationForm
        handleSubmit={handleSubmit}
        isSubmitting={isPending}
      />
    </SheetWithPreventingDialog>
  );
};
