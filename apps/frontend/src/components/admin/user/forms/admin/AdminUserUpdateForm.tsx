import {
  AutocompleteOrganization,
  UserOrganizationFormProps,
} from '@/components/admin/user/AutocompleteOrganization';
import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userEditAdminFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { cn, isEmpty } from '@/lib/utils';
import { DeleteIcon } from '@filigran/icon';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  SheetFooter,
  toast,
} from '@filigran/ui';
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
        toast({
          title: t('Utils.Success'),
          description: t('UserActions.UserUpdated', { email: user.email }),
        });
        callback();
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

  const disableUser = (values: { disabled: boolean }) => {
    const input = values;
    updateUserMutation({
      variables: {
        input,
        id: user.id,
      },
      onCompleted: () => {
        toast({
          title: t('Utils.Success'),
          description: t('UserActions.UserUpdated', { email: user.email }),
        });
        callback();
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('UserForm.FirstName')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('UserForm.FirstName')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('UserForm.LastName')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('UserForm.LastName')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
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
                render={({ field: formField }) => {
                  return (
                    <FormItem>
                      <div className="grid gap-m items-center grid-cols-[1fr_4fr_3rem]">
                        <Label>
                          {
                            userOrganization.find(
                              ({ id }) => id === field.organization_id
                            )?.name
                          }
                        </Label>
                        <FormControl>
                          <CapabilityMultiSelect
                            value={formField.value}
                            onChange={formField.onChange}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="tertiary"
                          size="icon"
                          onClick={() => remove(index)}>
                          <DeleteIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            );
          })}
        </div>

        <SheetFooter className="justify-between sm:justify-between pb-0">
          {user.disabled ? (
            <Button
              variant="secondary"
              onClick={() => disableUser({ disabled: false })}>
              {t('UserActions.Enable')}
            </Button>
          ) : (
            <AlertDialogComponent
              AlertTitle={t('MenuActions.Disable')}
              actionButtonText={t('MenuActions.Disable')}
              variantName={'destructive'}
              triggerElement={
                <Button variant="secondary-destructive">
                  {t('UserActions.Disable')}
                </Button>
              }
              onClickContinue={() => disableUser({ disabled: true })}>
              {t('DisableUserDialog.TextDisableThisUser', {
                email: user.email,
              })}
            </AlertDialogComponent>
          )}
          <div className="flex gap-s">
            <Button
              variant="secondary"
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
