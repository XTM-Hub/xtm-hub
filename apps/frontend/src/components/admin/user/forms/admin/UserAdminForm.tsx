import {
  AutocompleteOrganization,
  UserOrganizationFormProps,
} from '@/components/admin/user/AutocompleteOrganization';
import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userAdminFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { cn, isEmpty } from '@/lib/utils';
import { DeleteIcon } from '@filigran/icon';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Label,
  SheetFooter,
} from '@filigran/ui/clients';
import { Button, Input } from '@filigran/ui/servers';
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('UserForm.Email')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('UserForm.Email')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        {isDevelopmentEnvSetting && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('UserForm.Password')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t('UserForm.Password')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
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

        <SheetFooter className="pt-2">
          <Button
            variant="secondary"
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
