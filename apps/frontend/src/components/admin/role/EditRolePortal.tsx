import RolePortalForm from '@/components/admin/role/RolePortalForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { toast } from '@filigran/ui';
import {
  PortalCapability,
  useRolePortalsQuery,
  useSsoGroupRolePortalsQuery,
  useUpdateRolePortalMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';

interface EditRolePortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rolePortal: string;
  capabilities: PortalCapability[];
}

const EditRolePortal = ({
  open,
  onOpenChange,
  rolePortal,
  capabilities,
}: EditRolePortalProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { mutate: updateRolePortal } = useUpdateRolePortalMutation(
    portalGraphqlClient,
    {
      onSuccess: async () => {
        onOpenChange(false);
        // A rename cascades to the SSO group mappings.
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
    <SheetWithPreventingDialog
      title={t('RoleListPage.EditRole')}
      setOpen={onOpenChange}
      open={open}>
      <RolePortalForm
        rolePortal={{ name: rolePortal, capabilities }}
        handleSubmit={(input) => updateRolePortal({ name: rolePortal, input })}
      />
    </SheetWithPreventingDialog>
  );
};

export default EditRolePortal;
