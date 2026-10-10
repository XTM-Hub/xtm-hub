import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { Form, FormField } from '@/components/ui/form';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { isEmpty } from '@/lib/utils';
import { Button, Input } from '@filigran/design-system';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface UserFormProps {
  handleSubmit: (values: z.infer<typeof userFormSchema>) => void;
  validationSchema: typeof userFormSchema;
}
export const UserForm = ({ handleSubmit, validationSchema }: UserFormProps) => {
  const { handleCloseSheet, setIsDirty } = useDialogContext();

  const t = useTranslate();

  const form = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      password: '',
      capabilities: [],
    },
  });

  // Some issue with addUser, the formState isDirty without any modification, so for now we check if dirtyFields get any key
  setIsDirty(!isEmpty(form.formState.dirtyFields));

  const onSubmit = (values: z.infer<typeof validationSchema>) => {
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
