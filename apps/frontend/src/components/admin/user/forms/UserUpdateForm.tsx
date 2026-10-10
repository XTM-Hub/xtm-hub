import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userEditFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { RemoveUserFromOrga } from '@/components/admin/user/RemoveUserFromOrga';
import { UserSlugEditMutation } from '@/components/admin/user/user.graphql';
import { getUserListContext } from '@/components/admin/user/UserListPage';
import { PortalContext } from '@/components/me/AppPortalContext';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { Form, FormField } from '@/components/ui/form';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { isEmpty } from '@/lib/utils';
import { Button } from '@filigran/design-system';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-relay';
import { z } from 'zod';

interface UserUpdateFormProps {
  user: UserList_fragment$data;
  callback: () => void;
}

export const UserUpdateForm = ({ user, callback }: UserUpdateFormProps) => {
  const { handleCloseSheet, setIsDirty } = useDialogContext();
  const { me } = useContext(PortalContext);
  const t = useTranslate();
  const isAdminPath = useAdminPath();

  const userOrg = user.organization_capabilities?.find(
    (org) => org.organization.id === me?.selected_organization_id
  );
  const form = useForm<z.infer<typeof userEditFormSchema>>({
    resolver: zodResolver(userEditFormSchema),
    defaultValues: {
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      capabilities: [...(userOrg?.capabilities ?? [])],
    },
  });

  // Some issue with addUser, the formState isDirty without any modification, so for now we check if dirtyFields get any key
  setIsDirty(!isEmpty(form.formState.dirtyFields));

  const [updateUserMutation] = useMutation(UserSlugEditMutation);

  const { connectionID } = getUserListContext();
  const updateUser = (values: z.infer<typeof userEditFormSchema>) => {
    const variables = isAdminPath
      ? values
      : { capabilities: values.capabilities };
    updateUserMutation({
      variables: {
        input: {
          ...variables,
        },
        id: user.id,
        userListConnections: [connectionID ?? ''],
      },
      onCompleted: () => {
        showSnackbar({
          severity: 'success',
          title: t('Utils.Success'),
          description: t('UserActions.UserUpdated', { email: user.email }),
        });
        callback();
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

  const onSubmit = (values: z.infer<typeof userEditFormSchema>) => {
    updateUser(values);
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-xl">
        <CapabilityDescription />
        <FormField
          control={form.control}
          name="capabilities"
          render={({ field, fieldState }) => (
            <CapabilityMultiSelect
              label={t('UserForm.OrganizationCapabilities')}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <SheetFooter className="justify-between sm:justify-between pb-0">
          <RemoveUserFromOrga user={user} />
          <div className="flex gap-s">
            <Button
              priority="secondary"
              type="button"
              onClick={(e) => handleCloseSheet(e)}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              disabled={!form.formState.isValid}
              type="submit">
              {t('Utils.Validate')}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};
