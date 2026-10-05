import { PortalContext } from '@/components/me/AppPortalContext';
import { ServiceFormJsonFileField } from '@/components/service/form/JsonFileField';
import { ServiceFormSheetFooter } from '@/components/service/form/SheetFooter';
import { useServiceFormFields } from '@/components/service/form/UseServiceFormFields';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  fileListCheck,
  optionalFileListCheck,
  transformToFileList,
} from '@/utils/documents';
import { AutoForm } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentImageType } from '@graphql/generated';
import { useContext, useMemo } from 'react';
import slugify from 'slugify';
import { z } from 'zod';

/** First OpenCTI version able to import hunt packs, applied by the API when the declared version is lower. */
export const HUNT_PACK_MINIMUM_PRODUCT_VERSION = '7.261003.0';

export const huntPackDescriptionValue =
  '### Overview\n\n' +
  'The threats, techniques and hypotheses the hunts of this pack cover\n\n' +
  '### Hunted platforms\n\n' +
  'The platforms the native queries target and the log sources the hunts need\n\n' +
  '### How to use it\n\n' +
  'Import the pack, review the draft hunts in Defense > Hunts, then activate them\n\n' +
  '### Expected outcome\n\n' +
  'What a hit means and how to triage it\n\n' +
  '### Additional detail\n\n' +
  'Optional\n';

const openCTIHuntPackFormSchema = z.object({
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
export type OpenCTIHuntPackFormValues = z.infer<
  typeof openCTIHuntPackFormSchema
>;

export interface OpenCTIHuntPackFormProps {
  handleSubmit: (values: OpenCTIHuntPackFormValues) => void;
  document?: documentItem_fragment$data;
}

export const OpenctiHuntPackForm = ({
  handleSubmit,
  document,
}: OpenCTIHuntPackFormProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);

  const isCreation = !document;
  const { handleCloseSheet, setIsDirty } = useDialogContext();
  const onSubmit = (values: OpenCTIHuntPackFormValues) => {
    if (isCreation) {
      handleSubmit({ ...values, images: images as unknown as FileList });
    } else {
      const finalImages = images.filter(
        (img) => !imagesToDelete.includes(img.id)
      );
      handleSubmit({ ...values, images: finalImages as unknown as FileList });
    }
  };

  const values = useMemo(
    () =>
      ({
        ...document,
        description: document?.description ?? huntPackDescriptionValue,
        product_version:
          document?.product_version ?? HUNT_PACK_MINIMUM_PRODUCT_VERSION,
        images: transformToFileList(DocumentImageType.Image, document),
        logo: transformToFileList(DocumentImageType.Logo, document),
        use_cases: document?.use_cases?.map((useCase) => useCase.id),
        uploader_id: document?.uploader?.id ?? me?.id,
        uploader_organization_id:
          (isCreation
            ? me?.selected_organization_id
            : document?.uploader_organization?.id) ?? '',
      }) as OpenCTIHuntPackFormValues,
    [me, document, isCreation]
  );
  const formSchema = useMemo(
    () =>
      document
        ? openCTIHuntPackFormSchema.extend({
            document: z.custom<FileList>(fileListCheck).optional(),
            images: z.custom<FileList>(optionalFileListCheck).optional(),
          })
        : openCTIHuntPackFormSchema,
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
    documentType: 'Hunt Pack',
    platform: 'OpenCTI',
    document,
  });

  return (
    <AutoForm
      onSubmit={(values, _methods) => {
        onSubmit(values as OpenCTIHuntPackFormValues);
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
              label: t('Service.OpenCTIHuntPack.Form.SelectHuntPackFile'),
              description: t(
                'Service.OpenCTIHuntPack.Form.SelectHuntPackFileDescription'
              ),
              fieldType: 'file',
              inputProps: {
                allowedTypes: 'application/json',
              },
            }
          : {
              fieldType: ({ field }) => (
                <ServiceFormJsonFileField
                  field={field}
                  setIsDirty={setIsDirty}
                  document={document}
                />
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
