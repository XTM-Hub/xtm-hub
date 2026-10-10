import { getUserListContext } from '@/components/admin/user/UserListPage';
import { UserForm } from '@/components/admin/user/forms/UserForm';
import { userFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { UserListCreateMutation } from '@/components/admin/user/user.graphql';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { userListCreateMutation } from '@generated/userListCreateMutation.graphql';
import { useState } from 'react';
import { useMutation } from 'react-relay';
import { z } from 'zod';

export const AddUser = () => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);

  const [commitUserMutation] = useMutation<userListCreateMutation>(
    UserListCreateMutation
  );

  const { connectionID } = getUserListContext();
  const handleSubmit = (values: z.infer<typeof userFormSchema>) => {
    commitUserMutation({
      variables: {
        input: {
          ...values,
        },
        connections: [connectionID],
      },
      onCompleted: () => {
        setOpenSheet(false);
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('UserActions.UserCreated', { email: values.email }),
        });
      },
      onError: (error) => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };

  return (
    <SheetWithPreventingDialog
      title={t('UserActions.AddUser')}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={<Button>{t('UserActions.AddUser')}</Button>}>
      <UserForm
        handleSubmit={handleSubmit}
        validationSchema={userFormSchema}
      />
    </SheetWithPreventingDialog>
  );
};
