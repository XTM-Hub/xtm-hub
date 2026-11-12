import { UserForm } from '@/components/admin/user/forms/UserForm';
import { userFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { useRefreshUsersList } from '@/components/admin/user/use-refresh-users-list';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import { useUserResendInviteMutation } from '@graphql/generated';
import { useState } from 'react';
import { z } from 'zod';

export const AddUser = () => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);

  const refreshUsersList = useRefreshUsersList();
  // The resend operation makes the same addUser call as a creation.
  const { mutate: createUser } = useUserResendInviteMutation<Error>(
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

  const handleSubmit = (values: z.infer<typeof userFormSchema>) => {
    createUser({
      input: {
        ...values,
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
        <Button {...analyticsId('organization_member_create')}>
          {t('UserActions.AddUser')}
        </Button>
      }>
      <UserForm
        handleSubmit={handleSubmit}
        validationSchema={userFormSchema}
      />
    </SheetWithPreventingDialog>
  );
};
