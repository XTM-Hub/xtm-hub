import { getUserListContext } from '@/components/admin/user/UserListPage';
import { UserAdminForm } from '@/components/admin/user/forms/admin/UserAdminForm';
import { userAdminFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { Button, useToast } from '@filigran/ui';
import { AdminAddUserMutation as AdminAddUserMutationType } from '@generated/AdminAddUserMutation.graphql';
import { useState } from 'react';
import { graphql, useMutation } from 'react-relay';
import { z } from 'zod';

export const AdminAddUserMutation = graphql`
  mutation AdminAddUserMutation(
    $input: AdminAddUserInput!
    $connections: [ID!]!
  ) {
    adminAddUser(input: $input)
      @prependNode(connections: $connections, edgeTypeName: "UserEdge") {
      ...UserList_fragment
    }
  }
`;

export const AdminAddUser = () => {
  const t = useTranslate();
  const [openSheet, setOpenSheet] = useState(false);

  const { toast } = useToast();
  const [commitUserMutation] =
    useMutation<AdminAddUserMutationType>(AdminAddUserMutation);

  const { connectionID } = getUserListContext();

  const handleSubmit = (values: z.infer<typeof userAdminFormSchema>) => {
    commitUserMutation({
      variables: {
        input: {
          ...values,
        },
        connections: [connectionID],
      },
      onCompleted: () => {
        setOpenSheet(false);
        toast({
          title: t('Utils.Success'),
          description: t('UserActions.UserCreated', { email: values.email }),
        });
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
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
      <UserAdminForm handleSubmit={handleSubmit} />
    </SheetWithPreventingDialog>
  );
};
