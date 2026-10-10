import { PortalContext } from '@/components/me/AppPortalContext';
import { ServiceFormSheetFooter } from '@/components/service/form/SheetFooter';
import { useServiceFormFields } from '@/components/service/form/UseServiceFormFields';
import { FormItem } from '@/components/ui/form';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import {
  fileListCheck,
  optionalFileListCheck,
  transformToFileList,
} from '@/utils/documents';
import { AutoForm } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import {
  DocumentImageType,
  DocumentMetadataKeyCode,
  IntegrationType,
} from '@graphql/generated';
import { useContext, useMemo } from 'react';
import slugify from 'slugify';
import { z } from 'zod';

const thirdPartyIntegrationFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required'),
  uploader_id: z.string().optional(),
  short_description: z.string().min(1, 'Required').max(250),
  description: z.string().min(1, 'Required'),
  uploader_organization_id: z.string().min(1, 'Required'),
  integration_type: z.string().min(1, 'Required'),
  use_cases: z.array(z.string()).min(1, 'Required'),
  solution_categories: z.array(z.string()).min(1, 'Required'),
  license_type: z.enum(['Free', 'Commercial']).optional(),
  vendor_url: z.url().min(1, 'Required'),
  github_url: z.url().nullish(),
  product_version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, {
      error: 'Product version must be X.Y.Z',
    })
    .nullish(),
  active: z.boolean().optional(),
  datasheet_url: z.url().or(z.literal('')).nullish(),
  blogpost_url: z.url().or(z.literal('')).nullish(),
  demo_url: z.url().or(z.literal('')).nullish(),
  document: z.custom<FileList>(fileListCheck).optional(), // declared for genericity but not used
  logo: z.custom<FileList>(optionalFileListCheck).optional(),
  images: z.custom<FileList>(fileListCheck).optional(),
});

export type ThirdPartyIntegrationFormValues = z.infer<
  typeof thirdPartyIntegrationFormSchema
>;

interface ThirdPartyIntegrationFormProps {
  handleSubmit: (values: ThirdPartyIntegrationFormValues) => void;
  document: documentItem_fragment$data | undefined;
}

export const ThirdPartyIntegrationForm = ({
  handleSubmit,
  document,
}: ThirdPartyIntegrationFormProps) => {
  const { me } = useContext(PortalContext);
  const { handleCloseSheet } = useDialogContext();

  const isCreation = !document;

  const onSubmit = (values: ThirdPartyIntegrationFormValues) => {
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
        solution_categories: document?.solution_categories?.map(
          (category) => category.id
        ),
        license_type: document?.license_type ?? undefined,
        uploader_id: document?.uploader?.id ?? me!.id,
        uploader_organization_id:
          (isCreation
            ? me?.selected_organization_id
            : document?.uploader_organization?.id) ?? '',
        integration_type: IntegrationType.ThirdPartyIntegration,
        github_url: document?.github_url,
        product_version: document?.product_version,
        vendor_url: document?.vendor_url,
      }) as ThirdPartyIntegrationFormValues,
    [me, document, isCreation]
  );
  const formSchema = useMemo(() => {
    const extendedSchema = document
      ? thirdPartyIntegrationFormSchema.extend({
          document: z.custom<FileList>(fileListCheck).optional(),
          images: z.custom<FileList>(fileListCheck).optional(),
        })
      : thirdPartyIntegrationFormSchema;

    return extendedSchema.superRefine((data, ctx) => {
      if (data.github_url && !data.product_version) {
        ctx.addIssue({
          path: [DocumentMetadataKeyCode.ProductVersion],
          code: 'custom',
          message: 'Github URL and product version must be filled together',
        });
      }

      if (!data.github_url && data.product_version) {
        ctx.addIssue({
          path: [DocumentMetadataKeyCode.GithubUrl],
          code: 'custom',
          message: 'Github URL and product version must be filled together',
        });
      }
    });
  }, [document]);

  const {
    active,
    short_description,
    slug,
    name,
    product_version,
    vendor_url,
    github_url,
    description,
    use_cases,
    solution_categories,
    license_type,
    uploader_id,
    uploader_organization_id,
    integration_type,
    datasheet_url,
    blogpost_url,
    demo_url,
    imagesField,
    images,
    imagesToDelete,
    logo,
  } = useServiceFormFields({
    documentType: 'Third Party Integration',
    platform: 'OpenCTI',
    document,
  });

  return (
    <>
      <AutoForm
        onSubmit={(values, _methods) => {
          onSubmit(values as ThirdPartyIntegrationFormValues);
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
          if (values.product_version === '') {
            form.setValue(DocumentMetadataKeyCode.ProductVersion, undefined);
          }
          if (values.github_url === '') {
            form.setValue(DocumentMetadataKeyCode.GithubUrl, undefined);
          }
        }}
        values={values}
        formSchema={formSchema}
        fieldConfig={{
          description,
          use_cases,
          solution_categories,
          license_type: {
            ...license_type,
            fieldType: 'radio',
          },
          uploader_id,
          uploader_organization_id,
          document: { fieldType: () => <FormItem hidden={true} /> },
          logo,
          images: imagesField,
          active,
          short_description,
          slug,
          name,
          integration_type,
          vendor_url,
          github_url,
          product_version,
          datasheet_url,
          blogpost_url,
          demo_url,
        }}>
        <ServiceFormSheetFooter handleCloseSheet={handleCloseSheet} />
      </AutoForm>
    </>
  );
};
