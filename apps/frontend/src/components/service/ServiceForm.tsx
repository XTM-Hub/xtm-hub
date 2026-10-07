import { zodResolver } from '@hookform/resolvers/zod';

import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { fromFileSelectValue, toFileSelectValue } from '@/utils/documents';
import { Button, FileSelect } from '@filigran/design-system';
import { Form, FormField, SheetFooter } from '@filigran/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export const newPicturesSchema = z.object({
  illustration_document: z.custom<FileList>(),
  logo_document: z.custom<FileList>(),
});

interface ServiceFormProps {
  handleSubmit: (values: z.infer<typeof newPicturesSchema>) => void;
}

export const ServiceForm = ({ handleSubmit }: ServiceFormProps) => {
  const t = useTranslate();
  const { handleCloseSheet } = useDialogContext();
  const form = useForm<z.infer<typeof newPicturesSchema>>({
    resolver: zodResolver(newPicturesSchema),
    defaultValues: {
      illustration_document: undefined,
      logo_document: undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof newPicturesSchema>) => {
    handleSubmit({
      ...values,
    });
    form.reset();
  };

  return (
    <div className="absolute inset-0 p-xl pt-[5rem]">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-xl">
          <FormField
            control={form.control}
            name="illustration_document"
            render={({ field, fieldState }) => (
              <FileSelect
                label={t('ServiceForm.Illustration')}
                triggerLabel={t('Service.FileForm.SelectDocument')}
                placeholder={t('Service.FileForm.NoDocument')}
                accept="image/jpeg, image/gif, image/png, image/svg+xml"
                name={field.name}
                ref={field.ref}
                value={toFileSelectValue(field.value)}
                onValueChange={(next) =>
                  field.onChange(fromFileSelectValue(next))
                }
                error={fieldState.error?.message}
              />
            )}
          />
          <FormField
            control={form.control}
            name="logo_document"
            render={({ field, fieldState }) => (
              <FileSelect
                label={t('ServiceForm.Logo')}
                triggerLabel={t('Service.FileForm.SelectDocument')}
                placeholder={t('Service.FileForm.NoDocument')}
                accept="image/jpeg, image/gif, image/png, image/svg+xml"
                name={field.name}
                ref={field.ref}
                value={toFileSelectValue(field.value)}
                onValueChange={(next) =>
                  field.onChange(fromFileSelectValue(next))
                }
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
            <Button type="submit">{t('Utils.Validate')}</Button>
          </SheetFooter>
        </form>
      </Form>
    </div>
  );
};
