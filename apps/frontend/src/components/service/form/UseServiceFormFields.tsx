import { ServiceFormDescriptionField } from '@/components/service/form/DescriptionField';
import { ServiceFormEntityTypesField } from '@/components/service/form/EntityTypesField';
import { ServiceFormLogoField } from '@/components/service/form/LogoField';
import {
  ServiceFormMultipleImagesField,
  ServiceFormMultipleImagesFieldImages,
} from '@/components/service/form/MultipleImagesField';
import { ServiceFormSolutionCategoryField } from '@/components/service/form/SolutionCategoryField';
import { ServiceFormUploaderIdField } from '@/components/service/form/UploaderIdField';
import { ServiceFormUploaderOrganizationIdField } from '@/components/service/form/UploaderOrganizationIdField';
import { ServiceFormUseCasesField } from '@/components/service/form/UseCasesField';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { filterDocumentImages } from '@/utils/documents';
import { FormItem } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import {
  DocumentMetadataKeyCode,
  FiligranProduct,
  IntegrationType,
} from '@graphql/generated';
import { useMemo, useState } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

type DocumentType =
  | 'CSV Feed'
  | 'TAXII Feed'
  | 'RSS Feed'
  | 'Stream'
  | 'Third Party Integration'
  | 'Custom Dashboard'
  | 'Custom View'
  | 'Scenario'
  | 'Playbook'
  | 'Connector';

const integrationTypeMappedByDocumentType: Record<
  DocumentType,
  IntegrationType | null
> = {
  'Custom Dashboard': null,
  'Custom View': null,
  Scenario: null,
  Playbook: null,
  'CSV Feed': IntegrationType.CsvFeed,
  'TAXII Feed': IntegrationType.TaxiiFeed,
  'RSS Feed': IntegrationType.RssFeed,
  Stream: IntegrationType.Stream,
  'Third Party Integration': IntegrationType.ThirdPartyIntegration,
  Connector: IntegrationType.Connector,
};

type Platform = 'OpenCTI' | 'OpenAEV';

const productTagByPlatform: Record<Platform, FiligranProduct> = {
  OpenCTI: FiligranProduct.Opencti,
  OpenAEV: FiligranProduct.Openaev,
};

type AvailableFields =
  | 'description'
  | 'uploader_id'
  | 'uploader_organization_id'
  | 'use_cases'
  | 'solution_categories'
  | 'license_type'
  | 'entity_types'
  | 'images'
  | 'integration_type'
  | 'active'
  | 'short_description'
  | 'slug'
  | 'name'
  | 'vendor_url'
  | 'github_url'
  | 'datasheet_url'
  | 'blogpost_url'
  | 'demo_url'
  | 'product_version'
  | 'container_image'
  | 'source_code'
  | 'subscription_link'
  | 'verified'
  | 'manager_supported'
  | 'playbook_supported'
  | 'minimum_deployable_version';

interface Props {
  documentType: DocumentType;
  platform: Platform;
  document?: documentItem_fragment$data;
  disabledFields?: AvailableFields[];
}

export const useServiceFormFields = ({
  documentType,
  platform,
  document,
  disabledFields = [],
}: Props) => {
  const isCreation = !document;
  const [images, setImages] = useState<
    Array<ServiceFormMultipleImagesFieldImages>
  >(
    filterDocumentImages(
      document
    ) as unknown as ServiceFormMultipleImagesFieldImages[]
  );

  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const { setIsDirty } = useDialogContext();
  const integrationType = integrationTypeMappedByDocumentType[documentType];
  const t = useTranslate();

  return useMemo(
    () => ({
      images,
      imagesToDelete,
      description: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormDescriptionField
            field={field}
            documentType={documentType}
            required
            disabled={disabledFields.includes('description')}
          />
        ),
      },
      uploader_id: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormUploaderIdField
            field={field}
            document={document}
            disabled={disabledFields.includes('uploader_id')}
          />
        ),
      },
      uploader_organization_id: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormUploaderOrganizationIdField
            field={field}
            isCreation={isCreation}
            document={document}
            disabled={disabledFields.includes('uploader_organization_id')}
          />
        ),
      },
      use_cases: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormUseCasesField
            field={field}
            disabled={disabledFields.includes('use_cases')}
            product={productTagByPlatform[platform]}
            required={integrationType !== IntegrationType.Connector}
          />
        ),
      },
      solution_categories: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormSolutionCategoryField
            field={field}
            disabled={disabledFields.includes('solution_categories')}
            product={productTagByPlatform[platform]}
          />
        ),
      },
      entity_types: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormEntityTypesField
            field={field}
            disabled={disabledFields.includes('entity_types')}
          />
        ),
      },
      imagesField: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormMultipleImagesField
            field={field}
            document={document}
            images={images}
            setImages={setImages}
            imagesToDelete={imagesToDelete}
            setImagesToDelete={setImagesToDelete}
            setIsDirty={setIsDirty}
          />
        ),
      },
      logo: {
        fieldType: ({
          field,
        }: {
          field: ControllerRenderProps<FieldValues, string>;
        }) => (
          <ServiceFormLogoField
            field={field}
            document={document}
          />
        ),
      },
      integration_type: { fieldType: () => <FormItem hidden={true} /> },
      license_type: {
        label: t('Service.Form.LicenseTypeLabel'),
        inputProps: {
          disabled: disabledFields.includes('license_type'),
        },
      },
      active: {
        label: t('Service.Form.PublishedPlaceholder', {
          documentType,
        }),
        inputProps: {
          disabled: disabledFields.includes('active'),
        },
      },
      short_description: {
        label: t('Service.Form.ShortDescriptionLabel'),
        inputProps: {
          placeholder: t('Service.Form.ShortDescriptionPlaceholder'),
          disabled: disabledFields.includes('short_description'),
        },
      },
      slug: {
        label: t('Service.Form.SlugLabel'),
        inputProps: {
          placeholder: t('Service.Form.SlugPlaceholder'),
          readOnly: !isCreation,
          disabled: disabledFields.includes('slug'),
          className: !isCreation ? 'opacity-50 cursor-not-allowed' : '',
        },
      },
      name: {
        label: t(`Service.Form.NameLabel`),
        inputProps: {
          placeholder: t('Service.Form.NamePlaceholder', { documentType }),
          disabled: disabledFields.includes('name'),
        },
      },
      vendor_url: {
        label: t('Service.Form.VendorUrlLabel'),
        inputProps: {
          placeholder: t('Service.Form.UrlPlaceholder'),
          disabled: disabledFields.includes(DocumentMetadataKeyCode.VendorUrl),
        },
      },
      github_url: {
        label: t('Service.Form.GithubUrlLabel'),
        inputProps: {
          placeholder: t('Service.Form.UrlPlaceholder'),
          disabled: disabledFields.includes(DocumentMetadataKeyCode.GithubUrl),
        },
      },
      datasheet_url: {
        label: t('Service.Form.DatasheetUrlLabel'),
        inputProps: {
          placeholder: t('Service.Form.UrlPlaceholder'),
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.DatasheetUrl
          ),
        },
      },
      blogpost_url: {
        label: t('Service.Form.BlogpostUrlLabel'),
        inputProps: {
          placeholder: t('Service.Form.UrlPlaceholder'),
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.BlogpostUrl
          ),
        },
      },
      demo_url: {
        label: t('Service.Form.DemoUrlLabel'),
        inputProps: {
          placeholder: t('Service.Form.UrlPlaceholder'),
          disabled: disabledFields.includes(DocumentMetadataKeyCode.DemoUrl),
        },
      },
      product_version: {
        label: t('Service.Form.ProductVersionLabel', { platform }),
        inputProps: {
          placeholder: t('Service.Form.ProductVersionPlaceholder'),
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.ProductVersion
          ),
        },
      },
      minimum_deployable_version: {
        label: t('Service.Form.MinimumDeployableVersionLabel', { platform }),
        inputProps: {
          placeholder: t('Service.Form.MinimumDeployableVersionPlaceholder'),
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.MinimumDeployableVersion
          ),
        },
      },
      container_image: {
        label: t('Service.Form.ContainerImageLabel'),
        inputProps: {
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.ContainerImage
          ),
        },
      },
      source_code: {
        label: t('Service.Form.SourceCodeLabel'),
        inputProps: {
          disabled: disabledFields.includes(DocumentMetadataKeyCode.SourceCode),
        },
      },
      subscription_link: {
        label: t('Service.Form.SubscriptionLinkLabel'),
        inputProps: {
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.SubscriptionLink
          ),
        },
      },
      verified: {
        label: t('Service.Form.VerifiedLabel'),
        inputProps: {
          disabled: disabledFields.includes(DocumentMetadataKeyCode.Verified),
        },
      },
      manager_supported: {
        label: t('Service.Form.ManagerSupportedLabel'),
        inputProps: {
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.ManagerSupported
          ),
        },
      },
      playbook_supported: {
        label: t('Service.Form.PlaybookSupportedLabel'),
        inputProps: {
          disabled: disabledFields.includes(
            DocumentMetadataKeyCode.PlaybookSupported
          ),
        },
      },
    }),
    [
      documentType,
      platform,
      t,
      isCreation,
      document,
      integrationType,
      images,
      setImages,
      imagesToDelete,
      setImagesToDelete,
      setIsDirty,
      disabledFields,
    ]
  );
};
