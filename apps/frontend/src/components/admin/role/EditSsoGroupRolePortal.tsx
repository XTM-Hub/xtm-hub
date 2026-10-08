import SsoGroupRolePortalForm from '@/components/admin/role/SsoGroupRolePortalForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  useSsoGroupRolePortalsQuery,
  useUpdateSsoGroupRolePortalMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';

interface EditSsoGroupRolePortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ssoGroup: string;
  rolePortal: string;
}

const EditSsoGroupRolePortal = ({
  open,
  onOpenChange,
  ssoGroup,
  rolePortal,
}: EditSsoGroupRolePortalProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { mutate: updateSsoGroupRolePortal } =
    useUpdateSsoGroupRolePortalMutation(portalGraphqlClient, {
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
    <SheetWithPreventingDialog
      title={t('RoleListPage.EditMapping')}
      setOpen={onOpenChange}
      open={open}>
      <SsoGroupRolePortalForm
        ssoGroupRolePortal={{ ssoGroup, rolePortal }}
        handleSubmit={(input) =>
          updateSsoGroupRolePortal({ ssoGroup, rolePortal, input })
        }
      />
    </SheetWithPreventingDialog>
  );
};

export default EditSsoGroupRolePortal;
