import { Readable } from 'stream';
import { DocumentImageType } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { DocumentId } from '../../../model/kanel/public/Document';
import { MinIOClient } from '../../../thirdparty/minio/client';
import {
  buildManifestRebuildSingletonKey,
  MANIFEST_QUEUES,
  MANIFEST_REBUILD_DEBOUNCE_SECONDS,
} from '../../../thirdparty/pgboss/manifest.jobs';
import { PgBossProducer } from '../../../thirdparty/pgboss/producer';
import { logApp } from '../../../utils/app-logger.util';
import { getErrorMessage } from '../../../utils/error/error-guard.util';
import { formatDateCompact } from '../../../utils/format';
import { streamToBase64 } from '../../../utils/process-upload-file';
import { mapWithConcurrency } from '../../../utils/typescript';
import { WithParentId } from '../../document/document.helper';
import { DocumentImage } from '../../document/document.model';
import { DocumentChildrenDomain } from '../../document/domain/document.children.domain';
import { ManifestFragmentHelper } from '../manifest-fragment/manifest-fragment.helper';
import { ConnectorV2 } from '../opencti/integration/integration.model';
import { ManifestKey } from './manifest.consts';
import { ManifestContract, ManifestOutput } from './manifest.types';

export const MANIFEST_CATALOG_ID = 'filigran-catalog-id';
export const MANIFEST_CATALOG_NAME = 'OpenCTI Connectors contracts';
export const MANIFEST_CATALOG_DESCRIPTION = '';
export const MANIFEST_SCHEMA_VERSION = '1';

/**
 * The AWS SDK v3 S3 client used for all MinIO operations in this process
 * (see thirdparty/minio/client.ts) does not override the default
 * `NodeHttpHandler` agent config, so it defaults to 50 max sockets per
 * protocol (see @smithy/node-http-handler's `resolveDefaultConfig`). That
 * socket pool is shared by the whole backend process (uploads, downloads,
 * deletes across every concurrent request), not dedicated to manifest
 * generation, so we only take a conservative slice of it here (~1/4) to
 * parallelize logo downloads for potentially hundreds of connectors
 * without starving other concurrent MinIO traffic.
 */
const MANIFEST_LOGO_DOWNLOAD_CONCURRENCY = 12;

const buildManifestVersion = (version: string, now: Date): string => {
  return `connector-manifest-${version}-${formatDateCompact(now)}`;
};

const DEFAULT_LOGO_MIME_TYPE = 'image/png';

export const toDataUri = (
  base64: string,
  mimeType: string | null | undefined
): string => {
  return `data:${mimeType ?? DEFAULT_LOGO_MIME_TYPE};base64,${base64}`;
};

const safeParseJson = (
  value: string | null | undefined,
  fieldName: string
): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    logApp.error(
      `Manifest field "${fieldName}" is not a JSON object, falling back to {}`
    );
    return {};
  } catch {
    logApp.error(
      `Manifest field "${fieldName}" contains invalid JSON, falling back to {}`
    );
    return {};
  }
};

export const ManifestHelper = {
  enqueueImmediateRebuild: async (key: ManifestKey): Promise<void> => {
    await PgBossProducer.send(MANIFEST_QUEUES.IMMEDIATE, key, {
      singletonKey: buildManifestRebuildSingletonKey(key),
    });
  },

  scheduleDebouncedRebuild: async (key: ManifestKey): Promise<void> => {
    await PgBossProducer.debounce(MANIFEST_QUEUES.REBUILD, key, {
      singletonKey: buildManifestRebuildSingletonKey(key),
      debounceSeconds: MANIFEST_REBUILD_DEBOUNCE_SECONDS,
    });
  },

  loadConnectorLogosBase64: async (
    connectorIds: DocumentId[]
  ): Promise<Map<DocumentId, string | null>> => {
    const logoByConnectorId = new Map<DocumentId, string | null>(
      connectorIds.map((id) => [id, null])
    );
    if (connectorIds.length === 0) {
      return logoByConnectorId;
    }

    let images: WithParentId<DocumentImage>[];
    try {
      images = await DocumentChildrenDomain.loadImagesByParentIds<
        WithParentId<DocumentImage>
      >(connectorIds, { isDataLoader: true });
    } catch (error) {
      logApp.error('[MANIFEST] Failed to load connector logo documents', {
        error: getErrorMessage(error),
        connectorIds,
      });
      return logoByConnectorId;
    }

    const logoDocumentByConnectorId = new Map<
      DocumentId,
      WithParentId<DocumentImage>
    >();
    for (const image of images) {
      const connectorId = image._parent_id as DocumentId;
      if (
        image.image_type === DocumentImageType.Logo &&
        !logoDocumentByConnectorId.has(connectorId)
      ) {
        logoDocumentByConnectorId.set(connectorId, image);
      }
    }

    await mapWithConcurrency(
      Array.from(logoDocumentByConnectorId.entries()),
      MANIFEST_LOGO_DOWNLOAD_CONCURRENCY,
      async ([connectorId, logoDocument]) => {
        if (!logoDocument.minio_name) {
          return;
        }
        try {
          const body = await MinIOClient.downloadFile(logoDocument.minio_name);
          if (!body) {
            // The logo object is missing from storage; skip it and keep generating.
            return;
          }
          const base64 = await streamToBase64(body as Readable);
          logoByConnectorId.set(
            connectorId,
            toDataUri(base64, logoDocument.mime_type)
          );
        } catch (error) {
          logApp.error('[MANIFEST] Failed to load connector logo', {
            error: getErrorMessage(error),
            connectorId,
          });
        }
      }
    );

    return logoByConnectorId;
  },

  partitionConnectorsByVersionCompatibility: (
    connectors: ConnectorV2[],
    version: string
  ): { compatible: ConnectorV2[]; incompatible: ConnectorV2[] } => {
    const compatible: ConnectorV2[] = [];
    const incompatible: ConnectorV2[] = [];
    const paddedVersion =
      ManifestFragmentHelper.validateAndFormatManifestVersion(version);

    for (const connector of connectors) {
      const minVersion = connector.minimum_deployable_version_padded;
      if (minVersion && minVersion > paddedVersion) {
        incompatible.push(connector);
      } else {
        compatible.push(connector);
      }
    }

    return { compatible, incompatible };
  },

  buildManifestFileNameWithPath: (
    product: string,
    version: string,
    now: Date = new Date()
  ): string => {
    return `${product}/${version}/connector/manifest/${buildManifestVersion(version, now)}.json`;
  },

  buildManifestObjectKey: (
    product: string,
    version: string,
    name: string
  ): string => {
    return `${product}/${version}/connector/manifest/${name}.json`;
  },

  uploadManifest: async (
    manifest: ManifestOutput,
    fileName: string
  ): Promise<void> => {
    const user = requestContext.requireUser();
    const jsonBuffer = Buffer.from(JSON.stringify(manifest));
    const uploadedFile = {
      createReadStream: () => Readable.from(jsonBuffer),
      filename: fileName,
      mimetype: 'application/json',
      encoding: 'utf-8',
    };
    await MinIOClient.uploadFile(uploadedFile, fileName, user.id, fileName);
  },

  buildConnectorManifestOutput: (
    version: string,
    connectors: ConnectorV2[],
    now: Date = new Date(),
    useCasesByConnectorId: Map<string, string[]>,
    logoByConnectorId: Map<DocumentId, string | null> = new Map(),
    solutionCategoriesByConnectorId: Map<string, string[]> = new Map()
  ): ManifestOutput => {
    const contracts: ManifestContract[] = connectors.map((connector) => ({
      id: connector.manifest_fragment_id,
      title: connector.name ?? '',
      slug: connector.slug ?? '',
      description: connector.description ?? '',
      short_description: connector.short_description ?? '',
      logo: logoByConnectorId.get(connector.id) ?? null,
      use_cases: useCasesByConnectorId.get(connector.id as string) ?? [],
      solution_categories:
        solutionCategoriesByConnectorId.get(connector.id as string) ?? [],
      verified: connector.verified,
      last_verified_date: connector.last_verified_date ?? null,
      subscription_link: connector.subscription_link ?? null,
      source_code: connector.source_code ?? null,
      manager_supported: connector.manager_supported,
      min_version: connector.minimum_deployable_version ?? null,
      license_type: connector.license_type ?? null,
      contact: connector.contact ?? null,
      version: connector.version,
      image_name: connector.image_name,
      image_type: connector.image_type,
      additional_properties: safeParseJson(
        connector.additional_properties,
        'additional_properties'
      ),
      config_schema: safeParseJson(connector.config_schema, 'config_schema'),
    }));

    return {
      id: MANIFEST_CATALOG_ID,
      name: MANIFEST_CATALOG_NAME,
      description: MANIFEST_CATALOG_DESCRIPTION,
      manifest_schema_version: MANIFEST_SCHEMA_VERSION,
      manifest_version: buildManifestVersion(version, now),
      product_version: version,
      contracts,
    };
  },
};
