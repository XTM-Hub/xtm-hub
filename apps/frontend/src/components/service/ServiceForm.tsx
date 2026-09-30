import { zodResolver } from '@hookform/resolvers/zod';

import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { FileInput, FileInputDropZone, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, SheetFooter } from '@filigran/ui';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@filigran/design-system';

export const newPicturesSchema = z.object({
  illustration_document: z.custom<FileList>(),
  logo_document: z.custom<FileList>(),
});

interface ServiceFormProps {
  handleSubmit: (values: z.infer<typeof newPicturesSchema>) => void;
}

export const ServiceForm = ({ handleSubmit }: ServiceFormProps) => {
  const t = useTranslations();
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
    <FileInputDropZone className="absolute inset-0 p-xl pt-[5rem]">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-xl">
          <FormField
            control={form.control}
            name="illustration_document"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>{t('ServiceForm.Illustration')}</FormLabel>
                  <FormControl>
                    <FileInput
                      {...field}
                      texts={{
                        selectFile: t('Service.FileForm.SelectDocument'),
                        noFile: t('Service.FileForm.NoDocument'),
                        dropFiles: t('Service.FileForm.DropDocuments'),
                      }}
                      allowedTypes={
                        'image/jpeg, image/gif, image/png, image/svg'
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="logo_document"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>{t('ServiceForm.Logo')}</FormLabel>
                  <FormControl>
                    <FileInput
                      {...field}
                      texts={{
                        selectFile: t('Service.FileForm.SelectDocument'),
                        noFile: t('Service.FileForm.NoDocument'),
                        dropFiles: t('Service.FileForm.DropDocuments'),
                      }}
                      allowedTypes={
                        'image/jpeg, image/gif, image/png, image/svg'
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <SheetFooter className="pt-2">
            <Button
              priority="secondary" type="button" onClick={(e) => handleCloseSheet(e)}>
              {t('Utils.Cancel')}
            </Button>
            <Button type="submit">{t('Utils.Validate')}</Button>
          </SheetFooter>
        </form>
      </Form>
    </FileInputDropZone>
  );
};
