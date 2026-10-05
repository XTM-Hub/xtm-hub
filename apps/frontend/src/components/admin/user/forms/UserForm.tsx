import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { userFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { CapabilityMultiSelect } from '@/components/ui/capability/MultiSelect';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { isEmpty } from '@/lib/utils';
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
} from '@filigran/ui';
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
        <CapabilityDescription />
        <FormField
          control={form.control}
          name="capabilities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('UserForm.OrganizationCapabilities')}</FormLabel>
              <FormControl>
                <CapabilityMultiSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
