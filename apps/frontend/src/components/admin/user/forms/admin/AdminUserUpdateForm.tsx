import {
  AutocompleteOrganization,
  UserOrganizationFormProps,
} from '@/components/admin/user/AutocompleteOrganization';
import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userEditAdminFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { useRefreshUsersList } from '@/components/admin/user/use-refresh-users-list';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Form, FormField } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { cn, isEmpty } from '@/lib/utils';
import { Button, IconButton, Input } from '@filigran/design-system';
import { DeleteIcon } from '@filigran/icon';
import { useUserAdminEditMutation } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContext, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

interface AdminUserUpdateFormProps {
  user: UsersListUser;
  callback: () => void;
}

export const AdminUserUpdateForm = ({
  user,
  callback,
}: AdminUserUpdateFormProps) => {
  const t = useTranslate();
  const { handleCloseSheet, setIsDirty } = useDialogContext();
  const { settings } = useContext(SettingsContext);

  // Matches the API, which accepts a password in development only.
  const isDevelopmentEnvSetting = settings?.environment === 'development';

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
      password: '',
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

  const refreshUsersList = useRefreshUsersList();
  // One mutation for the update and the status change, as before: both report
  // the same way.
  const { mutate: updateUserMutation } = useUserAdminEditMutation<Error>(
    portalGraphqlClient,
    {
      // On the hook, not on mutate: like Relay, the outcome is handled even if
      // the form is gone by then.
      onSuccess: () => {
        refreshUsersList();
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
    }
  );

  // The API handles a null field like a field left out, as Relay sent them.
  const updateUser = ({
    password,
    ...values
  }: z.infer<typeof userEditAdminFormSchema>) => {
    updateUserMutation({
      id: user.id,
      input: {
        first_name: values.first_name ?? null,
        last_name: values.last_name ?? null,
        organization_capabilities: values.organization_capabilities,
        // An empty password keeps the current one.
        password: password || null,
        disabled: null,
        email: null,
      },
    });
  };

  const disableUser = ({ disabled }: { disabled: boolean }) => {
    updateUserMutation({
      id: user.id,
      input: {
        disabled,
        first_name: null,
        last_name: null,
        organization_capabilities: null,
        password: null,
        email: null,
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
        className="w-full space-y-6">
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
        {isDevelopmentEnvSetting && (
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                label={t('UserForm.Password')}
                type="password"
                // Keeps the browser from filling in the administrator's own saved password.
                autoComplete="new-password"
                placeholder={t('UserForm.Password')}
                helperText={t('UserForm.PasswordHelper')}
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        )}
        <CapabilityDescription />
        <div className="flex items-center gap-3">
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
            '!mt-3 px-4 py-3 space-y-2',
            fields.length > 0 && 'layer-1 border bg-elevation-default rounded'
          )}>
          {fields.map((field, index) => {
            return (
              <FormField
                control={form.control}
                key={`organization_capabilities.${index}.capabilities`}
                name={`organization_capabilities.${index}.capabilities`}
                render={({ field: formField, fieldState }) => {
                  const organizationName = userOrganization.find(
                    ({ id }) => id === field.organization_id
                  )?.name;
                  return (
                    <div className="grid gap-3 items-center grid-cols-[1fr_4fr_3rem]">
                      <Label>{organizationName}</Label>
                      <CapabilityMultiSelect
                        accessibleName={organizationName}
                        value={formField.value}
                        onChange={formField.onChange}
                        error={fieldState.error?.message}
                        // The box is layer 1, where a layer-1 panel paints the input colour.
                        contentClassName="layer-0"
                      />
                      <IconButton
                        type="button"
                        priority="tertiary"
                        {...analyticsId('admin_user_organization_remove')}
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
              {...analyticsId('admin_user_status_toggle')}
              onClick={() => disableUser({ disabled: false })}>
              {t('UserActions.Enable')}
            </Button>
          ) : (
            <ConfirmDialog
              confirmAnalyticsId="admin_user_deactivation_confirm"
              title={t('MenuActions.Disable')}
              confirmLabel={t('MenuActions.Disable')}
              destructive
              trigger={
                <Button
                  variant="destructive"
                  priority="secondary"
                  {...analyticsId('admin_user_status_toggle')}>
                  {t('UserActions.Disable')}
                </Button>
              }
              onConfirm={() => disableUser({ disabled: true })}>
              {t('DisableUserDialog.TextDisableThisUser', {
                email: user.email,
              })}
            </ConfirmDialog>
          )}
          <div className="flex gap-2">
            <Button
              priority="secondary"
              type="button"
              {...analyticsId('admin_form_cancel')}
              onClick={(e) => handleCloseSheet(e)}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              disabled={!form.formState.isValid}
              type="submit"
              {...analyticsId('admin_user_submit')}>
              {t('Utils.Validate')}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};
