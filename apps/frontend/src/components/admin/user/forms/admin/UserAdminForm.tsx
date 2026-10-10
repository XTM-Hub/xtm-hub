import {
  AutocompleteOrganization,
  UserOrganizationFormProps,
} from '@/components/admin/user/AutocompleteOrganization';
import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userAdminFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { Form, FormField } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { cn, isEmpty } from '@/lib/utils';
import { Button, IconButton, Input } from '@filigran/design-system';
import { DeleteIcon } from '@filigran/icon';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContext, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

interface UserAdminFormProps {
  handleSubmit: (values: z.infer<typeof userAdminFormSchema>) => void;
}
export const UserAdminForm = ({ handleSubmit }: UserAdminFormProps) => {
  const { handleCloseSheet, setIsDirty } = useDialogContext();
  const t = useTranslate();
  const { settings } = useContext(SettingsContext);
  const [userOrganization, setUserOrganization] = useState<
    UserOrganizationFormProps[]
  >([]);

  const addUserOrganization = (value: UserOrganizationFormProps) => {
    setUserOrganization([...userOrganization, value]);
  };

  const isDevelopmentEnvSetting =
    settings?.environment && settings.environment !== 'production';

  const form = useForm<z.infer<typeof userAdminFormSchema>>({
    resolver: zodResolver(userAdminFormSchema),
    defaultValues: {
      password: '',
      organization_capabilities: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    name: 'organization_capabilities',
    control: form.control,
  });
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
  // Some issue with addUser, the formState isDirty without any modification, so for now we check if dirtyFields get any key
  setIsDirty(!isEmpty(form.formState.dirtyFields));

  const onSubmit = (values: z.infer<typeof userAdminFormSchema>) => {
    handleSubmit({
      ...values,
    });
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-xl">
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label={t('UserForm.Email')}
              placeholder={t('UserForm.Email')}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
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
                placeholder={t('UserForm.Password')}
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        )}

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
            '!mt-m px-l py-s space-y-s',
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

        <SheetFooter className="pt-2">
          <Button
            priority="secondary"
            type="button"
            onClick={(e) => handleCloseSheet(e)}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            disabled={!form.formState.isDirty}
            type="submit">
            {t('Utils.Validate')}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
};
