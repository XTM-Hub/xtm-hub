import { randomUUID } from 'node:crypto';
import {
  DocumentMetadataKeyCode,
  IntegrationType,
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import type { DocumentId } from '../../../model/kanel/public/Document';
import { logApp } from '../../../utils/app-logger.util';
import { BadRequestErrorCode } from '../../../utils/error/error.code';
import { BadRequestError } from '../../../utils/error/error.util';
import { isLtsVersion } from '../../../utils/versioning';
import { DocumentDomain } from '../../document/domain/document.domain';
import { solutionCategoryDomain } from '../../solution-category/solution-category.domain';
import { useCaseDomain } from '../../use-case/use-case.domain';
import {
  ManifestFragmentHelper,
  TAG_DECOUPLING,
  TAG_LATEST,
  TAG_LATEST_LTS,
} from '../manifest-fragment/manifest-fragment.helper';
import {
  ConnectorV2,
  INTEGRATION_CONNECTOR_V2_METADATA_KEYS,
} from '../opencti/integration/integration.model';
import { ManifestKey } from './manifest.consts';
import { ManifestDomain } from './manifest.domain';
import { ManifestHelper } from './manifest.helper';
import { ManifestOutput } from './manifest.types';

const saveManifestToDatabase = async (
  key: ManifestKey,
  documentIds: DocumentId[],
  manifestName: string,
  claimId?: string
): Promise<void> => {
  await withTransaction(async () => {
    const savedManifest = await ManifestDomain.insertManifest({
      product: key.platformIdentifier,
      version: key.version,
      version_padded: ManifestFragmentHelper.validateAndFormatManifestVersion(
        key.version
      ),
      type: key.type,
      name: manifestName,
    });

    await ManifestDomain.insertManifestDocumentLinks(
      savedManifest.id,
      documentIds
    );

    const deletedCount = await ManifestDomain.deleteFromRebuildQueue(
      key,
      claimId
    );
    if (deletedCount === 0) {
      logApp.error('No processing queue entry found to delete', {
        key,
        claimId,
      });
    }
  });
};

const fetchConnectors = async (
  version: string,
  tag: string
): Promise<ConnectorV2[]> => {
  logApp.info('Fetching connectors', { tag, version });

  const connectors = (await DocumentDomain.loadDocumentsByMetadata(
    DocumentMetadataKeyCode.IntegrationType,
    IntegrationType.Connector,
    INTEGRATION_CONNECTOR_V2_METADATA_KEYS as DocumentMetadataKeyCode[],
    { active: true, is_decommissioned: false, tags: [tag, TAG_DECOUPLING] }
  )) as ConnectorV2[];
  logApp.info(
    `Found ${connectors.length} connector(s) v2 with tag "${tag}" for version ${version}`
  );

  const { compatible, incompatible } =
    ManifestHelper.partitionConnectorsByVersionCompatibility(
      connectors,
      version
    );

  if (incompatible.length === 0) {
    return compatible;
  }

  const incompatibleConnectorIds = incompatible.map((c) => c.id);
  const incompatibleSlugs = Array.from(
    new Set(
      incompatible
        .map((c) => c.slug)
        .filter((slug): slug is string => slug !== null)
    )
  );

  logApp.info('Incompatible connectors found, searching for fallbacks', {
    count: incompatible.length,
    version,
    connectorIds: incompatibleConnectorIds,
    slugs: incompatibleSlugs,
  });

  const fallbacks = await DocumentDomain.loadBestCompatibleConnectorsBySlugs(
    incompatibleSlugs,
    version
  );

  const fallbackSlugs = new Set(
    fallbacks.map((c) => c.slug).filter((slug): slug is string => slug !== null)
  );
  const notFound = incompatibleSlugs.filter((slug) => !fallbackSlugs.has(slug));
  if (notFound.length > 0) {
    const notFoundSlugSet = new Set(notFound);
    logApp.info(
      'No compatible fallback found for some connectors, they will be excluded from the manifest',
      {
        slugs: notFound,
        connectorIds: incompatible
          .filter((connector) => notFoundSlugSet.has(connector.slug ?? ''))
          .map((connector) => connector.id),
      }
    );
  }
  logApp.info('Fallback connectors found', { count: fallbacks.length });

  return [...compatible, ...fallbacks];
};

const recoverExpiredClaims = async (): Promise<void> => {
  const recovered = await ManifestDomain.recoverStuckProcessingEntries();
  if (recovered.length > 0) {
    logApp.error(
      'Manifest queue recovery: resetting stuck processing entries',
      {
        count: recovered.length,
        entries: recovered.map((row) => ({
          product: row.product,
          version: row.version,
          type: row.type,
          created_at: row.created_at,
        })),
      }
    );
  }
};

export const ManifestApp = {
  requestManifestGeneration: async ({
    product,
    version,
    type,
  }: {
    product: PlatformIdentifier;
    version: string;
    type: ManifestType;
  }): Promise<void> => {
    try {
      ManifestFragmentHelper.validateAndFormatManifestVersion(version);
    } catch {
      throw BadRequestError(BadRequestErrorCode.InvalidPlatformVersion, {
        detail: `Invalid version format: ${version}`,
      });
    }

    const key: ManifestKey = {
      platformIdentifier: product,
      version,
      type,
    };

    await ManifestDomain.insertIfNotPending(key);
    await ManifestHelper.enqueueImmediateRebuild(key);
  },

  /**
   * Rebuild requests are only processed when a job is sent for their key.
   * Requests queued without a job (by a database migration, by a failed
   * enqueue or by a process stopped during a rebuild, whose expired claim is
   * released first) are sent again: all of them when the workers start, and
   * periodically those pending since before `createdBefore`. Each key is
   * attempted on its own, and a key that fails stays pending for the next
   * attempt.
   */
  resumePendingRebuilds: async ({
    createdBefore,
  }: { createdBefore?: Date } = {}): Promise<{
    resumed: number;
    failed: number;
  }> => {
    await recoverExpiredClaims();
    const keys = await ManifestDomain.loadPendingRebuildKeys(createdBefore);
    let resumed = 0;
    const failedKeys: ManifestKey[] = [];
    for (const key of keys) {
      try {
        await ManifestHelper.enqueueImmediateRebuild(key);
        resumed += 1;
      } catch (error) {
        failedKeys.push(key);
        logApp.error('Unable to resume a pending manifest rebuild', {
          error,
          key,
        });
      }
    }
    if (keys.length > 0) {
      logApp.info('Pending manifest rebuilds resumed', {
        resumed,
        failed: failedKeys.length,
        failedKeys,
      });
    }
    return { resumed, failed: failedKeys.length };
  },

  processManifestQueue: async (manifest?: ManifestKey) => {
    await recoverExpiredClaims();

    logApp.info('Processing manifest queue');
    const claimId = randomUUID();
    const rows = await ManifestDomain.loadPendingManifestsForProcessing(
      manifest,
      claimId
    );
    logApp.info('Manifests locked for processing', {
      count: rows.length,
      claimId,
    });

    for (const row of rows) {
      const key: ManifestKey = {
        platformIdentifier: row.product,
        version: row.version,
        type: row.type,
      };
      try {
        const manifest = await ManifestApp.generateManifest(key, claimId);
        if (!manifest) {
          // Nothing to publish for this key: the request is done.
          await ManifestDomain.deleteFromRebuildQueue(key, claimId);
        }
      } catch (error) {
        logApp.error('Unable to process manifest', { error, manifest: row });
        try {
          // Pending again, the request is resumed by the next sweep.
          await ManifestDomain.returnToPending(key, claimId);
        } catch (requeueError) {
          logApp.error(
            'Unable to return a failed manifest rebuild to pending',
            {
              error: requeueError,
              manifest: row,
            }
          );
        }
      }
    }
  },

  generateManifest: async (
    key: ManifestKey,
    claimId?: string
  ): Promise<ManifestOutput | null> => {
    if (key.type != ManifestType.Connector) {
      logApp.error('UnsupportedManifestType', { type: key.type });
      return null;
    }
    const tag = isLtsVersion(key.version) ? TAG_LATEST_LTS : TAG_LATEST;
    const connectors = await fetchConnectors(key.version, tag);

    if (connectors.length === 0) {
      logApp.error('No connectors found for manifest', { key });
      return null;
    }

    const now = new Date();

    const useCaseRows = await useCaseDomain.buildUseCasesByDocumentIdQuery(
      connectors.map((c) => c.id as string)
    );
    const useCasesByConnectorId = new Map<string, string[]>();
    for (const row of useCaseRows) {
      const existing = useCasesByConnectorId.get(row._document_id) ?? [];
      existing.push(row.name);
      useCasesByConnectorId.set(row._document_id, existing);
    }

    const solutionCategoryRows =
      await solutionCategoryDomain.buildSolutionCategoriesByDocumentIdQuery(
        connectors.map((c) => c.id as string)
      );
    const solutionCategoriesByConnectorId = new Map<string, string[]>();
    for (const row of solutionCategoryRows) {
      const existing =
        solutionCategoriesByConnectorId.get(row._document_id) ?? [];
      existing.push(row.name);
      solutionCategoriesByConnectorId.set(row._document_id, existing);
    }

    const logoByConnectorId = await ManifestHelper.loadConnectorLogosBase64(
      connectors.map((c) => c.id)
    );

    const manifest = ManifestHelper.buildConnectorManifestOutput(
      key.version,
      connectors as ConnectorV2[],
      now,
      useCasesByConnectorId,
      logoByConnectorId,
      solutionCategoriesByConnectorId
    );

    const minioFileName = ManifestHelper.buildManifestFileNameWithPath(
      key.platformIdentifier,
      key.version,
      now
    );
    await ManifestHelper.uploadManifest(manifest, minioFileName);

    await saveManifestToDatabase(
      key,
      connectors.map((c) => c.id),
      manifest.manifest_version,
      claimId
    );

    logApp.info('Manifest uploaded to MinIO', { minioFileName });
    return manifest;
  },
};
