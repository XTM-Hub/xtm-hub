import { OrganizationForm } from '@/components/organization/OrganizationForm';
import { organizationFormSchema } from '@/components/organization/OrganizationForm.schema';
import { syncEditedOrganizationToRelayStore } from '@/components/organization/organization-relay-store';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrganizationItemFragment,
  useOrganizationEditMutation,
} from '@graphql/generated';
import { organizationKeys } from '@graphql/organization/organization.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useRelayEnvironment } from 'react-relay';
import { z } from 'zod';

interface EditOrganizationProps {
  organization: OrganizationItemFragment;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const EditOrganization = ({
  organization,
  open,
  setOpen,
}: EditOrganizationProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const relayEnvironment = useRelayEnvironment();
  const { mutate: editOrganization, isPending } = useOrganizationEditMutation(
    portalGraphqlClient,
    {
      onSuccess: async (
        { editOrganization: editedOrganization },
        { input }
      ) => {
        syncEditedOrganizationToRelayStore(
          relayEnvironment,
          editedOrganization
        );
        setOpen(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('OrganizationActions.OrganizationUpdated', {
            name: input.name,
          }),
        });
        await queryClient.invalidateQueries({
          queryKey: organizationKeys.all(),
        });
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${errorMessage}`),
        });
      },
    }
  );

  const handleSubmit = (values: z.infer<typeof organizationFormSchema>) => {
    editOrganization({
      id: organization.id,
      input: {
        ...values,
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
        isSubmitting={isPending}
      />
    </SheetWithPreventingDialog>
  );
};
