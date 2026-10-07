import {
  DocumentMetadataKeyCode,
  FiligranProduct,
  IntegrationType,
} from '../../../../../__generated__/resolvers-types';
import { withTransaction } from '../../../../../context/database.context';
import { logApp } from '../../../../../utils/app-logger.util';
import { toError } from '../../../../../utils/error/error-guard.util';
import { omit } from '../../../../../utils/utils';
import { DocumentApp } from '../../../../document/document.app';
import { DocumentDomain } from '../../../../document/domain/document.domain';
import { TelemetryApp } from '../../../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../../../telemetry/telemetry.helper';
import { TAG_DECOUPLING } from '../../../manifest-fragment/manifest-fragment.helper';
import { ConnectorTypeHelper } from '../connector-type.helper';
import {
  Connector,
  INTEGRATION_CONNECTOR_METADATA_KEYS,
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../integration.model';
import { IngestManifestHelper } from './ingest-manifest.helper';
import { ManifestInformation } from './ingest-manifest.model';

/**
 * The connector a refresh updates (the latest document of its slug that is not
 * a per-version copy, as DocumentDomain.upsertOnSlug picks it), read after
 * locking the documents of the slug until the transaction ends, so a connector
 * save committed meanwhile is read rather than overwritten.
 */
const loadLockedConnector = async (
  slug: string
): Promise<Connector | undefined> => {
  await DocumentDomain.lockDocumentsBySlugTypeAndServiceInstance({
    slug,
    type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
    serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
  });
  const documents = await DocumentDomain.loadDocumentsByMetadata(
    DocumentMetadataKeyCode.IntegrationType,
    IntegrationType.Connector,
    INTEGRATION_CONNECTOR_METADATA_KEYS as DocumentMetadataKeyCode[],
    { slug }
  );
  const [connector] = documents
    .filter(({ tags }) => !tags?.includes(TAG_DECOUPLING))
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime()
    );
  return connector as Connector | undefined;
};

export const IngestManifestDomain = {
  upsertConnectors: async (manifestInfo: ManifestInformation[]) => {
    const results: Array<Connector> = [];

    for (const connector of manifestInfo) {
      try {
        const uploadLogo = IngestManifestHelper.base64ToUpload(
          connector.logo,
          `${connector.name}-logo.png`
        );
        const { slug } = connector;
        if (!slug) {
          logApp.warn(`Skipping connector without slug: ${connector.name}`);
          continue;
        }

        const doc = await withTransaction(async () => {
          const existingConnector = await loadLockedConnector(slug);
          if (existingConnector) {
            if (
              !existingConnector.minimum_deployable_version &&
              connector.manager_supported
            ) {
              connector.minimum_deployable_version =
                existingConnector.product_version || connector.product_version;
            }

            if (existingConnector.datasheet_url) {
              connector.datasheet_url = existingConnector.datasheet_url;
            }

            if (existingConnector.blogpost_url) {
              connector.blogpost_url = existingConnector.blogpost_url;
            }

            if (existingConnector.demo_url) {
              connector.demo_url = existingConnector.demo_url;
            }

            // A contract without a valid container_type keeps the stored type.
            connector.image_type ??= ConnectorTypeHelper.normalize(
              existingConnector.image_type
            );
          }

          const minimumDeployableVersion =
            ConnectorTypeHelper.resolveMinimumDeployableVersion(
              ConnectorTypeHelper.normalize(connector.image_type),
              connector.minimum_deployable_version ??
                existingConnector?.minimum_deployable_version
            );
          if (minimumDeployableVersion) {
            connector.minimum_deployable_version = minimumDeployableVersion;
          }

          return DocumentApp.upsertDocumentWithExternalImage<Connector>(
            OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            { ...omit(connector, ['logo']) },
            uploadLogo,
            INTEGRATION_CONNECTOR_METADATA_KEYS,
            FiligranProduct.Opencti
          );
        });
        const newDocIsCreated = !doc.updated_at;
        if (newDocIsCreated) {
          const createEvent = await TelemetryHelper.buildCreateEvent(doc);
          await TelemetryApp.sendTelemetryEvent(createEvent);
        }

        results.push(doc);
      } catch (error) {
        logApp.error(`Failed to upsert connector ${connector.name}:`, {
          error: toError(error),
        });
        throw error;
      }
    }

    return results;
  },
};
