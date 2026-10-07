import RolePortalForm from '@/components/admin/role/RolePortalForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import { toast } from '@filigran/ui';

import {
  useAddRolePortalMutation,
  useRolePortalsQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const AddRolePortal = () => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);
  const queryClient = useQueryClient();
  const { mutate: addRolePortal } = useAddRolePortalMutation(
    portalGraphqlClient,
    {
      onSuccess: async () => {
        setOpenSheet(false);
        await queryClient.invalidateQueries({
          queryKey: useRolePortalsQuery.getKey(),
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
      title={t('RoleListPage.AddRole')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('RoleListPage.AddRole')}</Button>}>
      <RolePortalForm handleSubmit={(input) => addRolePortal({ input })} />
    </SheetWithPreventingDialog>
  );
};

export default AddRolePortal;
