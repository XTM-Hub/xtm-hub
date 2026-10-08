import SsoGroupRolePortalForm from '@/components/admin/role/SsoGroupRolePortalForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';

import { Button } from '@filigran/design-system';
import {
  useAddSsoGroupRolePortalMutation,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const AddSsoGroupRolePortal = () => {
  const t = useTranslate();
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
    }
  );

  return (
    <SheetWithPreventingDialog
      title={t('RoleListPage.AddMapping')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('RoleListPage.AddMapping')}</Button>}>
      <SsoGroupRolePortalForm
        handleSubmit={(input) => addSsoGroupRolePortal({ input })}
      />
    </SheetWithPreventingDialog>
  );
};

export default AddSsoGroupRolePortal;
