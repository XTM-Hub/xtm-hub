import {
  AutocompleteOrganization,
  UserOrganizationFormProps,
} from '@/components/admin/user/AutocompleteOrganization';
import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userEditAdminFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { cn, isEmpty } from '@/lib/utils';
import { Button, IconButton, Input } from '@filigran/design-system';
import { DeleteIcon } from '@filigran/icon';
import { Form, FormField, SheetFooter } from '@filigran/ui';
import { Label } from '@filigran/ui/clients';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { graphql, useMutation } from 'react-relay';
import { z } from 'zod';

interface AdminUserUpdateFormProps {
  user: UserList_fragment$data;
  callback: () => void;
}

export const AdminUserUpdateFormMutation = graphql`
  mutation AdminUserUpdateFormMutation($id: ID!, $input: AdminEditUserInput!) {
    adminEditUser(id: $id, input: $input) {
      ...UserList_fragment
    }
  }
`;

export const AdminUserUpdateForm = ({
  user,
  callback,
}: AdminUserUpdateFormProps) => {
  const t = useTranslate();
  const { handleCloseSheet, setIsDirty } = useDialogContext();

  const [userOrganization, setUserOrganization] = useState<
    UserOrganizationFormProps[]
  >(
    user.organization_capabilities?.map(({ organization }) => organization) ??
      []
  );

  const addUserOrganization = (value: UserOrganizationFormProps) => {
    setUserOrganization([...userOrganization, value]);
  };

  const onChangeAutocompleteOrganizationValue = (
    value?: UserOrganizationFormProps
  ) => {
    if (value) {
      append({
        organization_id: value.id,
        capabilities: [],
      });
      addUserOrganization(value);
    }
  };

  const form = useForm<z.infer<typeof userEditAdminFormSchema>>({
    resolver: zodResolver(userEditAdminFormSchema),
    defaultValues: {
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      organization_capabilities: (user.organization_capabilities ?? [])
        .filter((org) => !org.organization.personal_space)
        .map((o) => ({
          organization_id: o.organization.id ?? '',
          capabilities: [...(o.capabilities ?? [])],
        })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: 'organization_capabilities',
    control: form.control,
  });

  // Some issue with addUser, the formState isDirty without any modification, so for now we check if dirtyFields get any key
  setIsDirty(!isEmpty(form.formState.dirtyFields));

  const [updateUserMutation] = useMutation(AdminUserUpdateFormMutation);

  const updateUser = (values: z.infer<typeof userEditAdminFormSchema>) => {
    updateUserMutation({
      variables: {
        input: {
          ...values,
        },
        id: user.id,
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

  const disableUser = (values: { disabled: boolean }) => {
    const input = values;
    updateUserMutation({
      variables: {
        input,
        id: user.id,
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

  const onSubmit = (values: z.infer<typeof userEditAdminFormSchema>) => {
    updateUser(values);
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-xl">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field, fieldState }) => (
            <Input
              label={t('UserForm.FirstName')}
              placeholder={t('UserForm.FirstName')}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field, fieldState }) => (
            <Input
              label={t('UserForm.LastName')}
              placeholder={t('UserForm.LastName')}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
        <CapabilityDescription />
        <div className="flex items-center gap-m">
          <Label>{t('UserForm.Organizations')}</Label>
          <AutocompleteOrganization
            selectedOrganizationCapabilities={form.getValues(
              'organization_capabilities'
            )}
            onValueChange={onChangeAutocompleteOrganizationValue}
          />
        </div>

        <div
          className={cn(
            '!mt-m px-l py-m space-y-s',
            fields.length > 0 && 'border bg-card rounded'
          )}>
          {fields.map((field, index) => {
            return (
              <FormField
                control={form.control}
                key={`organization_capabilities.${index}.capabilities`}
                name={`organization_capabilities.${index}.capabilities`}
                render={({ field: formField, fieldState }) => {
                  return (
                    <div className="grid gap-m items-center grid-cols-[1fr_4fr_3rem]">
                      <Label>
                        {
                          userOrganization.find(
                            ({ id }) => id === field.organization_id
                          )?.name
                        }
                      </Label>
                      <CapabilityMultiSelect
                        value={formField.value}
                        onChange={formField.onChange}
                        error={fieldState.error?.message}
                      />
                      <IconButton
                        type="button"
                        priority="tertiary"
                        aria-label={t('MenuActions.Remove')}
                        icon={<DeleteIcon className="h-4 w-4" />}
                        onClick={() => remove(index)}
                      />
                    </div>
                  );
                }}
              />
            );
          })}
        </div>

        <SheetFooter className="justify-between sm:justify-between pb-0">
          {user.disabled ? (
            <Button
              priority="secondary"
              onClick={() => disableUser({ disabled: false })}>
              {t('UserActions.Enable')}
            </Button>
          ) : (
            <ConfirmDialog
              title={t('MenuActions.Disable')}
              confirmLabel={t('MenuActions.Disable')}
              destructive
              trigger={
                <Button
                  variant="destructive"
                  priority="secondary">
                  {t('UserActions.Disable')}
                </Button>
              }
              onConfirm={() => disableUser({ disabled: true })}>
              {t('DisableUserDialog.TextDisableThisUser', {
                email: user.email,
              })}
            </ConfirmDialog>
          )}
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
