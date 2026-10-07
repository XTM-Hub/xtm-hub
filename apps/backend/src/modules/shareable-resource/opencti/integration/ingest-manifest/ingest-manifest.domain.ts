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
import { DocumentMetadataDomain } from '../../../../document/domain/document.metadata.domain';
import { TelemetryApp } from '../../../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../../../telemetry/telemetry.helper';
import {
  IntegrationCoverageDomain,
  type LinkableVocabulary,
} from '../integration-coverage/integration-coverage.domain';
import { IntegrationCoverageHelper } from '../integration-coverage/integration-coverage.helper';
import type { CoverageInferenceSource } from '../integration-coverage/integration-coverage.model';
import {
  Connector,
  CONNECTOR_SLUG_LOCK_NAMESPACE,
  INTEGRATION_CONNECTOR_METADATA_KEYS,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../integration.model';
import { IngestManifestHelper } from './ingest-manifest.helper';
import { ManifestInformation } from './ingest-manifest.model';

/**
 * The values the connector document holds after the upsert, which keeps the
 * stored use cases when the manifest lists none and the stored solution
 * categories when the manifest omits them, and drops the manifest names it
 * cannot link: coverage is inferred from those.
 */
const loadEffectiveInferenceSource = async (
  connector: ManifestInformation,
  existingConnector: Connector | undefined,
  vocabulary: LinkableVocabulary
): Promise<CoverageInferenceSource> => {
  const fromManifest = IntegrationCoverageDomain.keepLinkableNames(vocabulary, {
    useCases: connector.use_cases ?? [],
    solutionCategories: connector.solution_categories ?? [],
  });
  const useCases =
    connector.use_cases?.length || !existingConnector
      ? fromManifest.use_cases
      : ((
          await IntegrationCoverageDomain.loadUseCaseNamesByDocumentIds([
            existingConnector.id,
          ])
        ).get(existingConnector.id) ?? []);
  const solutionCategories =
    connector.solution_categories !== undefined || !existingConnector
      ? fromManifest.solution_categories
      : ((
          await IntegrationCoverageDomain.loadSolutionCategoryNamesByDocumentIds(
            [existingConnector.id]
          )
        ).get(existingConnector.id) ?? []);
  return {
    ...connector,
    use_cases: useCases,
    solution_categories: solutionCategories,
  };
};

const keepCuratedFields = (
  connector: ManifestInformation,
  existingConnector: Connector
) => {
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
};

export const IngestManifestDomain = {
  upsertConnectors: async (manifestInfo: ManifestInformation[]) => {
    const results: Array<Connector> = [];
    // Loaded once for the whole manifest: names are resolved in memory
    const vocabulary = await IntegrationCoverageDomain.loadLinkableVocabulary();

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

        // Ingestions of one slug are serialized and resolved against the row
        // they update, locked: a connector created, curated or given a coverage
        // by a concurrent ingestion or an admin is kept, never overwritten from
        // an earlier read.
        const doc = await databaseContext.withAdvisoryLock(
          CONNECTOR_SLUG_LOCK_NAMESPACE,
          slug,
          async () => {
            const current = await DocumentDomain.findCurrentBySlug(
              { slug, type: OPENCTI_INTEGRATION_DOCUMENT_TYPE },
              { forUpdate: true }
            );
            const existingConnector =
              await DocumentMetadataDomain.hydrateMetadataOne(
                current as Connector | undefined,
                INTEGRATION_CONNECTOR_METADATA_KEYS as DocumentMetadataKeyCode[]
              );
            // The upsert would rewrite a feed, a stream or a third-party integration of the same slug as a connector
            if (
              existingConnector?.integration_type &&
              existingConnector.integration_type !== IntegrationType.Connector
            ) {
              logApp.warn(
                `Skipping connector ${connector.name}: its slug belongs to a ${existingConnector.integration_type} integration`,
                { slug }
              );
              return null;
            }
            if (existingConnector) {
              keepCuratedFields(connector, existingConnector);
            }
            const existingCoverage = existingConnector
              ? await IntegrationCoverageDomain.loadStoredCoverage(
                  existingConnector.id
                )
              : null;
            const coverage = IntegrationCoverageHelper.resolveCoverage({
              declared: connector.coverage,
              existing: existingCoverage,
              inferenceSource: await loadEffectiveInferenceSource(
                connector,
                existingConnector,
                vocabulary
              ),
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
          }
        );
        if (!doc) {
          continue;
        }
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
