import { db } from '../../../../knexfile';
import {
  DocumentImageType,
  DocumentMetadataKeyCode,
  DocumentSourceType,
  IntegrationType,
  LicenseType,
  ManifestType,
  type ManifestFragmentInput,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import Document from '../../../model/kanel/public/Document';
import { ObjectSolutionCategoryObjectId } from '../../../model/kanel/public/ObjectSolutionCategory';
import { logApp } from '../../../utils/app-logger.util';
import { isUniqueConstraintViolation } from '../../../utils/error/error-guard.util';
import { BadRequestErrorCode } from '../../../utils/error/error.code';
import { DocumentApp } from '../../document/document.app';
import { DocumentUploadsHelper } from '../../document/document.uploads.helper';
import { DocumentChildrenDomain } from '../../document/domain/document.children.domain';
import { DocumentDomain } from '../../document/domain/document.domain';
import { solutionCategoryApp } from '../../solution-category/solution-category.app';
import { isFiligranProduct } from '../../solution-category/solution-category.utils';
import {
  ConnectorTypeHelper,
  type OpenCtiConnectorType,
} from '../opencti/integration/connector-type.helper';
import { IngestManifestHelper } from '../opencti/integration/ingest-manifest/ingest-manifest.helper';
import {
  INTEGRATION_CONNECTOR_V2_METADATA_KEYS,
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
  type ConnectorV2,
} from '../opencti/integration/integration.model';
import { ManifestFragmentHelper } from './manifest-fragment.helper';

type ConnectorWithMetadata = Document & {
  version_padded?: string;
  datasheet_url?: string;
  blogpost_url?: string;
  demo_url?: string;
};

const toObjectSolutionCategoryObjectId = (
  id: string
): ObjectSolutionCategoryObjectId => id as ObjectSolutionCategoryObjectId;

const attachConnectorLogo = async ({
  connector,
  fragment,
}: {
  connector: ConnectorV2;
  fragment: ManifestFragmentInput;
}) => {
  const uploadLogo = IngestManifestHelper.base64ToUpload(
    fragment.logo,
    ManifestFragmentHelper.buildConnectorLogoFilename({
      title: fragment.title,
      version: fragment.version,
    })
  );

  const [logoFile] = await DocumentUploadsHelper.processUploads(
    uploadLogo,
    INTEGRATION_SERVICE_INSTANCE_ID
  );

  if (!logoFile) {
    return;
  }

  await DocumentChildrenDomain.createImageDocuments(
    connector.id,
    INTEGRATION_SERVICE_INSTANCE_ID,
    [logoFile],
    DocumentImageType.Logo,
    DocumentSourceType.External
  );
};

const createConnectorDocument = async ({
  fragment,
  formattedVersion,
  tags,
  metadataFromExisting,
  licenseType,
  contact,
  connectorType,
  minimumDeployableVersion,
}: {
  fragment: ManifestFragmentInput;
  formattedVersion: string;
  tags: string[];
  metadataFromExisting?: Pick<
    ConnectorWithMetadata,
    'datasheet_url' | 'blogpost_url' | 'demo_url'
  >;
  licenseType?: LicenseType;
  contact?: string;
  connectorType: OpenCtiConnectorType;
  minimumDeployableVersion: string;
}): Promise<ConnectorV2> => {
  const createdConnector =
    await DocumentApp.createDocumentWithChildrenAndMetadata<ConnectorV2>(
      {
        name: fragment.title,
        slug: fragment.slug,
        description: fragment.description,
        short_description: fragment.short_description,
        use_cases: fragment.use_cases,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        tags,
        source_type: DocumentSourceType.External,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        version: fragment.version,
        version_padded: formattedVersion,
        manifest_fragment_id: fragment.id,
        last_verified_date: fragment.last_verified_date,
        image_name: fragment.image_name,
        image_type: connectorType,
        integration_type: IntegrationType.Connector,
        verified: fragment.verified ?? false,
        source_code: fragment.source_code,
        subscription_link: fragment.subscription_link,
        manager_supported: fragment.manager_supported,
        minimum_deployable_version: minimumDeployableVersion,
        minimum_deployable_version_padded:
          ManifestFragmentHelper.validateAndFormatMinimumVersion(
            minimumDeployableVersion
          ),
        license_type: licenseType,
        contact,
        datasheet_url: metadataFromExisting?.datasheet_url,
        blogpost_url: metadataFromExisting?.blogpost_url,
        demo_url: metadataFromExisting?.demo_url,
        additional_properties: JSON.stringify(fragment.additional_properties),
        config_schema: JSON.stringify(fragment.config_schema),
      },
      INTEGRATION_CONNECTOR_V2_METADATA_KEYS
    );

  await attachConnectorLogo({ connector: createdConnector, fragment });

  return createdConnector;
};

const removeLatestTagFromExistingBatchConnectors = async ({
  connectors,
  latestTag,
}: {
  connectors: Document[];
  latestTag: string;
}) => {
  for (const connector of connectors) {
    const tags = connector.tags ?? [];
    if (!tags.includes(latestTag)) {
      continue;
    }

    const updatedTags = tags.filter((tag) => tag !== latestTag);
    await db<Document>('Document')
      .where({ id: connector.id })
      .update({ tags: updatedTags, updated_at: new Date() });
  }
};

export const ManifestFragmentDomain = {
  ingestManifestFragment: async (
    fragment: ManifestFragmentInput
  ): Promise<void> => {
    if (fragment.integration_type !== ManifestType.Connector) {
      throw new Error(BadRequestErrorCode.IntegrationTypeNotRecognized);
    }

    ManifestFragmentHelper.validateAndFormatMinimumVersion(
      fragment.min_version
    );
    const connectorType = ConnectorTypeHelper.parse(fragment.image_type);
    const minimumDeployableVersion =
      ConnectorTypeHelper.resolveMinimumDeployableVersion(
        connectorType,
        fragment.min_version
      ) ?? fragment.min_version;
    ManifestFragmentHelper.validateShortDescriptionLength(
      fragment.short_description
    );
    ManifestFragmentHelper.validateSolutionCategories(
      fragment.solution_categories
    );
    const licenseType = fragment.license_type ?? undefined;
    const contact = ManifestFragmentHelper.parseContact(fragment.contact);
    const formattedVersion =
      ManifestFragmentHelper.validateAndFormatManifestVersion(fragment.version);
    const latestTag =
      ManifestFragmentHelper.getLatestTagForConnectorVersion(formattedVersion);

    await withTransaction(async () => {
      // Serializes concurrent ingestions for the same connector slug.

      await DocumentDomain.lockDocumentsBySlugTypeAndServiceInstance({
        slug: fragment.slug,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
      });

      // Re-read the whole family after the lock statement so this transaction
      // uses a fresh snapshot that includes connectors inserted by prior
      // concurrent transactions.
      const existingBatchConnectorRows: Pick<Document, 'id'>[] =
        await db<Document>('Document')
          .where({
            slug: fragment.slug,
            type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
          })
          .select('id');

      const existingBatchConnectorIds = existingBatchConnectorRows.map(
        (connector) => connector.id
      );

      const existingConnectorsWithSameId =
        await DocumentDomain.loadDocumentsByMetadata(
          DocumentMetadataKeyCode.ManifestFragmentId,
          fragment.id,
          [],
          {
            type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
          }
        );

      const conflictingConnector = existingConnectorsWithSameId.find(
        (connector) => connector.slug !== fragment.slug
      );

      if (conflictingConnector) {
        throw new Error(BadRequestErrorCode.ConnectorIdAlreadyExists);
      }

      const existingBatchConnectors =
        (await DocumentDomain.loadDocumentsWithMetadataByIds(
          existingBatchConnectorIds,
          [
            DocumentMetadataKeyCode.VersionPadded,
            DocumentMetadataKeyCode.DatasheetUrl,
            DocumentMetadataKeyCode.BlogpostUrl,
            DocumentMetadataKeyCode.DemoUrl,
          ]
        )) as ConnectorWithMetadata[];

      const hasSameVersion = existingBatchConnectors.some(
        (connector) => connector.version === fragment.version
      );
      if (hasSameVersion) {
        throw new Error(BadRequestErrorCode.ConnectorVersionAlreadyExists);
      }

      const currentLatestConnector = existingBatchConnectors.find((connector) =>
        (connector.tags ?? []).includes(latestTag)
      );

      const metadataFromExisting =
        ManifestFragmentHelper.getConnectorMetadataFromExisting({
          currentLatestConnector,
          existingBatchConnectors,
        });

      const shouldPromoteAsLatest =
        !currentLatestConnector ||
        ManifestFragmentHelper.isStrictlyGreaterConnectorVersion({
          candidate: formattedVersion,
          current: currentLatestConnector.version_padded ?? '',
        });

      if (existingBatchConnectors.length > 0 && shouldPromoteAsLatest) {
        await removeLatestTagFromExistingBatchConnectors({
          connectors: existingBatchConnectors,
          latestTag,
        });
      }

      const newDocumentTags = ManifestFragmentHelper.getConnectorDocumentTags(
        shouldPromoteAsLatest,
        latestTag
      );

      try {
        const connector = await createConnectorDocument({
          fragment,
          formattedVersion,
          tags: newDocumentTags,
          metadataFromExisting,
          licenseType,
          contact,
          connectorType,
          minimumDeployableVersion,
        });

        const platform = fragment.platform.trim().toLowerCase();
        if (isFiligranProduct(platform)) {
          await solutionCategoryApp.linkSolutionCategoriesByNameToObject({
            objectId: toObjectSolutionCategoryObjectId(connector.id),
            names: fragment.solution_categories,
            product: platform,
          });
        } else {
          logApp.warn(
            'Unknown platform for solution-category linking, skipping',
            { platform }
          );
        }
      } catch (error) {
        // Backstop for brand-new connectors: no existing rows for the lock above.
        if (
          isUniqueConstraintViolation(
            error,
            'document_type_slug_version_unique'
          )
        ) {
          throw new Error(BadRequestErrorCode.ConnectorVersionAlreadyExists, {
            cause: error,
          });
        }
        throw error;
      }
    });
  },
};
