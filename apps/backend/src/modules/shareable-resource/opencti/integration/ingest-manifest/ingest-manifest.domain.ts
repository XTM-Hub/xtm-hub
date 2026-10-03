import {
  DocumentMetadataKeyCode,
  FiligranProduct,
  IntegrationType,
} from '../../../../../__generated__/resolvers-types';
import { databaseContext } from '../../../../../context/database.context';
import { logApp } from '../../../../../utils/app-logger.util';
import { toError } from '../../../../../utils/error/error-guard.util';
import { omit } from '../../../../../utils/utils';
import { DocumentApp } from '../../../../document/document.app';
import { DocumentDomain } from '../../../../document/domain/document.domain';
import { TelemetryApp } from '../../../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../../../telemetry/telemetry.helper';
import { IntegrationCoverageDomain } from '../integration-coverage/integration-coverage.domain';
import { IntegrationCoverageHelper } from '../integration-coverage/integration-coverage.helper';
import {
  Connector,
  INTEGRATION_CONNECTOR_METADATA_KEYS,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../integration.model';
import { IngestManifestHelper } from './ingest-manifest.helper';
import { ManifestInformation } from './ingest-manifest.model';

export const IngestManifestDomain = {
  upsertConnectors: async (manifestInfo: ManifestInformation[]) => {
    const results: Array<Connector> = [];
    const existingConnectors = await DocumentDomain.loadDocumentsByMetadata(
      DocumentMetadataKeyCode.IntegrationType,
      IntegrationType.Connector,
      INTEGRATION_CONNECTOR_METADATA_KEYS as DocumentMetadataKeyCode[]
    );

    const connectorsMappedBySlug: Map<string, Connector> =
      existingConnectors.reduce((acc, current) => {
        if (current.slug) {
          acc.set(current.slug, current as Connector);
        }
        return acc;
      }, new Map<string, Connector>());

    for (const connector of manifestInfo) {
      try {
        const uploadLogo = IngestManifestHelper.base64ToUpload(
          connector.logo,
          `${connector.name}-logo.png`
        );
        if (!connector.slug) {
          logApp.warn(`Skipping connector without slug: ${connector.name}`);
          continue;
        }

        const existingConnector = connectorsMappedBySlug.get(connector.slug);
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
        }

        // The existing coverage is read again under the document lock: an admin
        // declaration committed after the batch read is kept when the manifest
        // declares nothing.
        const doc = await databaseContext.withTransaction(async () => {
          const existingCoverage = existingConnector
            ? await IntegrationCoverageDomain.loadStoredCoverageForUpdate(
                existingConnector.id
              )
            : null;
          const coverage = IntegrationCoverageHelper.resolveCoverage({
            declared: connector.coverage,
            existing: existingCoverage,
            inferenceSource: connector,
          });
          return DocumentApp.upsertDocumentWithExternalImage<Connector>(
            OPENCTI_INTEGRATION_DOCUMENT_TYPE,
            {
              ...omit(connector, ['logo', 'coverage']),
              ...IntegrationCoverageHelper.toDocumentFields(coverage),
            },
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
