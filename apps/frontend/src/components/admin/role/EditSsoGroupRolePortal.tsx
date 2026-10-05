import SsoGroupRolePortalForm from '@/components/admin/role/SsoGroupRolePortalForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { toast } from '@filigran/ui';
import {
  PortalCapability,
  useSsoGroupRolePortalsQuery,
  useUpdateSsoGroupRolePortalMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';

interface EditSsoGroupRolePortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ssoGroup: string;
  rolePortal: string;
  capabilities: PortalCapability[];
}

const EditSsoGroupRolePortal = ({
  open,
  onOpenChange,
  ssoGroup,
  rolePortal,
  capabilities,
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
    <SheetWithPreventingDialog
      title={t('RoleListPage.EditMapping')}
      setOpen={onOpenChange}
      open={open}>
      <SsoGroupRolePortalForm
        ssoGroupRolePortal={{ ssoGroup, rolePortal, capabilities }}
        onClose={() => onOpenChange(false)}
        handleSubmit={(input) =>
          updateSsoGroupRolePortal({ ssoGroup, rolePortal, input })
        }
      />
    </SheetWithPreventingDialog>
  );
};

export default EditSsoGroupRolePortal;
