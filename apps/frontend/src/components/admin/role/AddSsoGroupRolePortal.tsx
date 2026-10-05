import SsoGroupRolePortalForm from '@/components/admin/role/SsoGroupRolePortalForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button, toast } from '@filigran/ui';
import {
  useAddSsoGroupRolePortalMutation,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const AddSsoGroupRolePortal = () => {
  const t = useTranslations();
  const [openSheet, setOpenSheet] = useState(false);
  const queryClient = useQueryClient();
  const { mutate: addSsoGroupRolePortal } = useAddSsoGroupRolePortalMutation(
    portalGraphqlClient,
    {
      onSuccess: async () => {
        setOpenSheet(false);
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
    }
  );

  return (
    <SheetWithPreventingDialog
      title={t('RoleListPage.AddMapping')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('RoleListPage.AddMapping')}</Button>}>
      <SsoGroupRolePortalForm
        onClose={() => setOpenSheet(false)}
        handleSubmit={(input) => addSsoGroupRolePortal({ input })}
      />
    </SheetWithPreventingDialog>
  );
};

export default AddSsoGroupRolePortal;
