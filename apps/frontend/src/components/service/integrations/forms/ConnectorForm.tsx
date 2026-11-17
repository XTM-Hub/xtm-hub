import { PortalContext } from '@/components/me/AppPortalContext';
import { ServiceFormSheetFooter } from '@/components/service/form/SheetFooter';
import { useServiceFormFields } from '@/components/service/form/UseServiceFormFields';
import { AutoForm } from '@/components/ui/auto-form';
import { FormItem } from '@/components/ui/form';
import {
  fileListCheck,
  optionalFileListCheck,
  transformToFileList,
} from '@/utils/documents';
import { isConnectorResource } from '@/utils/shareable-resources/shareable-resources.types';
import { semanticVersionRegex, validLtsVersionRegex } from '@/utils/versioning';
import {
  DocumentImageType,
  DocumentItemFragment,
  DocumentStatus,
  IntegrationType,
} from '@graphql/generated';
import { useContext, useMemo } from 'react';
import { z } from 'zod';

const connectorSchema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required'),
  status: z.enum(DocumentStatus).optional(),
  uploader_id: z.string().optional(),
  short_description: z.string().min(1, 'Required').max(250),
  description: z.string().min(1, 'Required'),
  product_version: z
    .string()
    .regex(semanticVersionRegex, {
      error: 'Product version must be a valid version',
    })
    .or(
      z.string().regex(validLtsVersionRegex, {
        error: 'Product version must be a valid version',
      })
    ),
  minimum_deployable_version: z
    .string()
    .regex(semanticVersionRegex, {
      error: 'Minimum deployable version must be a valid version',
    })
    .or(
      z.string().regex(validLtsVersionRegex, {
        error: 'Minimum deployable version must be a valid version',
      })
    )
    .nullable(),
  uploader_organization_id: z.string().min(1, 'Required'),
  integration_type: z.string().min(1, 'Required'),
  container_image: z.string().min(1, 'Required'),
  source_code: z.string().min(1, 'Required'),
  subscription_link: z.url().or(z.literal('')).nullish(),
  use_cases: z.array(z.string()).optional(),
  solution_categories: z.array(z.string()).min(1, 'Required'),
  license_type: z.enum(['Free', 'Commercial']).optional(),
  verified: z.boolean().optional(),
  manager_supported: z.boolean().optional(),
  playbook_supported: z.boolean().optional(),
  datasheet_url: z.url().or(z.literal('')).nullish(),
  blogpost_url: z.url().or(z.literal('')).nullish(),
  demo_url: z.url().or(z.literal('')).nullish(),
  document: z.custom<FileList>(fileListCheck).optional(), // declared for genericity but not used
  logo: z.custom<FileList>(optionalFileListCheck).optional(),
  images: z.custom<FileList>(optionalFileListCheck),
});
export type ConnectorFormValues = z.infer<typeof connectorSchema>;

interface ConnectorFormProps {
  handleSubmit: (values: ConnectorFormValues) => void;
  document: DocumentItemFragment | undefined;
}

export const ConnectorForm = ({
  handleSubmit,
  document,
}: ConnectorFormProps) => {
  const { me } = useContext(PortalContext);

  const onSubmit = (values: ConnectorFormValues) => {
    const finalImages = images.filter(
      (img) => !imagesToDelete.includes(img.id)
    );

    const finalValues = {
      ...values,
      images: finalImages as unknown as FileList,
      verified: `${values.verified ?? false}` as unknown as boolean,
      manager_supported:
        `${values.manager_supported ?? false}` as unknown as boolean,
      playbook_supported:
        `${values.playbook_supported ?? false}` as unknown as boolean,
    };
    handleSubmit(finalValues);
  };

  const connector =
    document && isConnectorResource(document) ? document : undefined;

  const values = useMemo(
    () =>
      ({
        ...document,
        images: transformToFileList(DocumentImageType.Image, document),
        logo: transformToFileList(DocumentImageType.Logo, document),
        use_cases: document?.use_cases?.map((label) => label.id),
        solution_categories: connector?.solution_categories?.map(
          (label) => label.id
        ),
        license_type: connector?.license_type ?? undefined,
        uploader_id: document?.uploader?.id ?? me!.id,
        uploader_organization_id: document?.uploader_organization?.id ?? '',
        integration_type: IntegrationType.Connector,
      }) as ConnectorFormValues,
    [me, document, connector]
  );

  const formSchema = useMemo(
    () =>
      connector?.manager_supported
        ? connectorSchema
        : connectorSchema.extend({
            minimum_deployable_version: z.string().nullish(),
          }),
    [connector?.manager_supported]
  );

  const {
    short_description,
    slug,
    name,
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
    product_version,
    container_image,
    source_code,
    verified,
    manager_supported,
    subscription_link,
    playbook_supported,
    imagesField,
    images,
    imagesToDelete,
    logo,
    minimum_deployable_version,
    status,
  } = useServiceFormFields({
    documentType: 'Connector',
    platform: 'OpenCTI',
    document,
    disabledFields: [
      'name',
      'slug',
      'uploader_id',
      'short_description',
      'description',
      'uploader_organization_id',
      'use_cases',
      'solution_categories',
      'license_type',
      'product_version',
      'container_image',
      'source_code',
      'subscription_link',
      'verified',
      'manager_supported',
      'playbook_supported',
    ],
  });

  if (!document) {
    return null;
  }

  return (
    <>
      <AutoForm
        onSubmit={(values, _methods) => {
          onSubmit(values as ConnectorFormValues);
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
          short_description,
          slug,
          name,
          integration_type,
          datasheet_url,
          blogpost_url,
          product_version,
          minimum_deployable_version: connector?.manager_supported
            ? minimum_deployable_version
            : { fieldType: () => <FormItem hidden={true} /> },
          demo_url,
          container_image,
          source_code,
          verified,
          manager_supported,
          playbook_supported,
          subscription_link,
          logo,
          images: imagesField,
          status,
          document: { fieldType: () => <FormItem hidden={true} /> },
        }}>
        <ServiceFormSheetFooter status={document?.status} />
      </AutoForm>
    </>
  );
};
