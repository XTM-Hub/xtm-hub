import { UserAdminForm } from '@/components/admin/user/forms/admin/UserAdminForm';
import { userAdminFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { useRefreshUsersList } from '@/components/admin/user/use-refresh-users-list';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import { useUserAdminResendInviteMutation } from '@graphql/generated';
import { useState } from 'react';
import { z } from 'zod';

export const AdminAddUser = () => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);

  const refreshUsersList = useRefreshUsersList();
  // The resend operation makes the same adminAddUser call as a creation.
  const { mutate: createUser } = useUserAdminResendInviteMutation<Error>(
    portalGraphqlClient,
    {
      // On the hook, not on mutate: like Relay, the outcome is handled even if
      // the form is gone by then.
      onSuccess: (_data, { input }) => {
        refreshUsersList();
        setOpenSheet(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('UserActions.UserCreated', { email: input.email }),
        });
      },
      onError: (error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    }
  );

  const handleSubmit = (values: z.infer<typeof userAdminFormSchema>) => {
    createUser({
      input: {
        ...values,
        first_name: values.first_name ?? null,
        last_name: values.last_name ?? null,
        password: values.password ?? null,
      },
    });
  };

  return (
    <SheetWithPreventingDialog
      title={t('UserActions.AddUser')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={
        <Button {...analyticsId('admin_user_create')}>
          {t('UserActions.AddUser')}
        </Button>
      }>
      <UserAdminForm handleSubmit={handleSubmit} />
    </SheetWithPreventingDialog>
  );
};
