import { PortalContext } from '@/components/me/AppPortalContext';
import { ServiceFormSheetFooter } from '@/components/service/form/SheetFooter';
import { useServiceFormFields } from '@/components/service/form/UseServiceFormFields';
import FileInputWithPrevent from '@/components/ui/FileInputWithPrevent';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  fileListCheck,
  optionalFileListCheck,
  transformToFileList,
} from '@/utils/documents';
import {
  AutoForm,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentImageType } from '@graphql/generated';
import { useContext, useMemo } from 'react';
import slugify from 'slugify';
import { z } from 'zod';

const openAEVScenarioFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required'),
  uploader_id: z.string().optional(),
  short_description: z.string().min(1, 'Required').max(250),
  description: z.string().min(1, 'Required'),
  product_version: z.string().regex(/^\d+\.\d+\.\d+$/, {
    error: 'Product version must be X.Y.Z',
  }),
  uploader_organization_id: z.string().min(1, 'Required'),
  use_cases: z.array(z.string()).min(1, 'Required'),
  active: z.boolean().optional(),
  document: z.custom<FileList>(fileListCheck),
  logo: z.custom<FileList>(optionalFileListCheck).optional(),
  images: z.custom<FileList>(optionalFileListCheck),
});
export type OpenAEVScenarioFormValues = z.infer<
  typeof openAEVScenarioFormSchema
>;

export interface OpenAEVScenarioFormProps {
  handleSubmit: (values: OpenAEVScenarioFormValues) => void;
  document?: documentItem_fragment$data;
}

export const OpenaevScenarioForm = ({
  handleSubmit,
  document,
}: OpenAEVScenarioFormProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);

  const isCreation = !document;
  const { handleCloseSheet, setIsDirty } = useDialogContext();
  const onSubmit = (values: OpenAEVScenarioFormValues) => {
    if (isCreation) {
      handleSubmit({ ...values, images: images as unknown as FileList });
    } else {
      const finalImages = images.filter(
        (img) => !imagesToDelete.includes(img.id)
      );

      const finalValues = {
        ...values,
        images: finalImages as unknown as FileList,
      };
      handleSubmit(finalValues);
    }
  };

  const values = useMemo(
    () =>
      ({
        ...document,
        images: transformToFileList(DocumentImageType.Image, document),
        logo: transformToFileList(DocumentImageType.Logo, document),
        use_cases: document?.use_cases?.map((useCase) => useCase.id),
        uploader_id: document?.uploader?.id ?? me?.id,
        uploader_organization_id:
          (isCreation
            ? me?.selected_organization_id
            : document?.uploader_organization?.id) ?? '',
      }) as OpenAEVScenarioFormValues,
    [me, document, isCreation]
  );
  const formSchema = useMemo(
    () =>
      document
        ? openAEVScenarioFormSchema.extend({
            document: z.custom<FileList>(fileListCheck).optional(),
            images: z.custom<FileList>(optionalFileListCheck).optional(),
          })
        : openAEVScenarioFormSchema,
    [document]
  );

  const {
    active,
    slug,
    name,
    short_description,
    product_version,
    description,
    uploader_organization_id,
    uploader_id,
    use_cases,
    imagesField,
    images,
    imagesToDelete,
    logo,
  } = useServiceFormFields({
    documentType: 'Scenario',
    platform: 'OpenAEV',
    document,
  });

  return (
    <AutoForm
      onSubmit={(values, _methods) => {
        onSubmit(values as OpenAEVScenarioFormValues);
      }}
      onValuesChange={(values, form) => {
        if (isCreation && values.name) {
          const generatedSlug = slugify(values.name, {
            lower: true,
            strict: true,
          });
          const currentSlug = form.getValues('slug');
          if (currentSlug !== generatedSlug) {
            form.setValue('slug', generatedSlug, { shouldDirty: false });
          }
        }
      }}
      values={values}
      formSchema={formSchema}
      fieldConfig={{
        description,
        use_cases,
        uploader_id,
        uploader_organization_id,
        document: isCreation
          ? {
              label: t('Service.OpenAEVScenario.Form.OpenAEVScenarioFile'),
              fieldType: 'file',
              inputProps: {
                accept: 'application/zip',
                multiple: 'multiple',
              },
            }
          : {
              fieldType: ({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(
                      'Service.OpenAEVScenario.Form.ExistingOpenAEVScenarioFile',
                      {
                        file_name: field.value?.[0].name ?? document?.file_name,
                      }
                    )}
                  </FormLabel>
                  <FormControl>
                    <div onClick={() => setIsDirty(true)}>
                      <FileInputWithPrevent
                        field={field}
                        texts={{
                          selectFile: t(
                            'Service.OpenAEVScenario.Form.UpdateZIPFile'
                          ),
                          dialogTitle: t(
                            'Service.OpenAEVScenario.Form.UpdateZIPFile'
                          ),
                          dialogDescription: t(
                            'Service.OpenAEVScenario.Form.DescriptionUpdateZIPFile'
                          ),
                        }}
                        allowedTypes="application/zip"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              ),
            },
        logo,
        images: imagesField,
        active,
        short_description,
        slug,
        name,
        product_version,
      }}>
      <ServiceFormSheetFooter handleCloseSheet={handleCloseSheet} />
    </AutoForm>
  );
};
