import { db } from '../../../../knexfile';
import {
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import type { DocumentId } from '../../../model/kanel/public/Document';
import type Manifest from '../../../model/kanel/public/Manifest';
import type {
  ManifestId,
  ManifestInitializer,
} from '../../../model/kanel/public/Manifest';
import type ManifestDocument from '../../../model/kanel/public/ManifestDocument';
import type { ManifestDocumentInitializer } from '../../../model/kanel/public/ManifestDocument';
import type ManifestRebuildQueue from '../../../model/kanel/public/ManifestRebuildQueue';
import type { ManifestRebuildQueueInitializer } from '../../../model/kanel/public/ManifestRebuildQueue';
import { isUniqueConstraintViolation } from '../../../utils/error/error-guard.util';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import {
  MANIFEST_LIST_MAX_COUNT,
  ManifestKey,
  ManifestRebuildQueueStatus,
} from './manifest.consts';

export const ManifestDomain = {
  insertIfNotPending: async (
    keys: ManifestKey | ManifestKey[]
  ): Promise<void> => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length === 0) return;

    const rows: ManifestRebuildQueueInitializer[] = keyList.map(
      ({ platformIdentifier, version, type }) => ({
        product: platformIdentifier,
        version,
        type,
        status: ManifestRebuildQueueStatus.Pending,
      })
    );
    await db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .insert(rows)
      .onConflict(['product', 'version', 'type', 'status'])
      .ignore();
  },

  loadDistinctManifestsAboveVersion: async (
    minVersionPadded: string,
    isLts: boolean,
    type: ManifestType
  ): Promise<Pick<Manifest, 'product' | 'version'>[]> => {
    return db<Manifest>('Manifest')
      .distinct('product', 'version')
      .where('type', type)
      .andWhere('version_padded', '>=', minVersionPadded)
      .andWhere('version_padded', isLts ? 'like' : 'not like', '%.LTS.%');
  },

  loadPendingRebuildKeys: async (): Promise<ManifestKey[]> => {
    const rows = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .distinct('product', 'version', 'type')
      .where({ status: ManifestRebuildQueueStatus.Pending });
    return rows.map(({ product, version, type }) => ({
      platformIdentifier: product,
      version,
      type,
    }));
  },

  loadPendingManifestsForProcessing: async (
    filter?: ManifestKey
  ): Promise<ManifestRebuildQueue[]> => {
    // transaction is not mandatory since done in a single query, but forUpdate and skipLocked are still needed in the subquery
    const subquery = db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .select('id')
      .where({
        status: ManifestRebuildQueueStatus.Pending,
        ...(filter
          ? {
              product: filter.platformIdentifier,
              version: filter.version,
              type: filter.type,
            }
          : {}),
      })
      // Skips keys already Processing: promoting this row too would violate
      // the (product, version, type, status) unique constraint.
      .whereRaw(
        `NOT EXISTS (
          SELECT 1 FROM "ManifestRebuildQueue" AS processing_check
          WHERE processing_check.status = ?
            AND processing_check.product = "ManifestRebuildQueue".product
            AND processing_check.version = "ManifestRebuildQueue".version
            AND processing_check.type = "ManifestRebuildQueue".type
        )`,
        [ManifestRebuildQueueStatus.Processing]
      )
      .forUpdate()
      .skipLocked();

    return db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .whereIn('id', subquery)
      .update({ status: ManifestRebuildQueueStatus.Processing })
      .returning('*');
  },

  insertManifest: async (
    initializer: ManifestInitializer
  ): Promise<Manifest> => {
    const [manifest] = await db<Manifest>('Manifest')
      .insert(initializer)
      .returning('*');
    if (!manifest) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    return manifest;
  },

  insertManifestDocumentLinks: async (
    manifestId: ManifestId,
    documentIds: DocumentId[]
  ): Promise<void> => {
    if (documentIds.length === 0) return;
    const rows: ManifestDocumentInitializer[] = documentIds.map(
      (document_id) => ({
        manifest_id: manifestId,
        document_id,
      })
    );
    await db<ManifestDocument>('Manifest_Document').insert(rows);
  },

  deleteFromRebuildQueue: async ({
    platformIdentifier,
    version,
    type,
  }: ManifestKey): Promise<number> => {
    // .returning('id') is required here: a bare .delete() result is a plain
    // number, which postProcessResponse silently turns into undefined.
    const deletedRows = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .where({
        product: platformIdentifier,
        version,
        type,
        status: ManifestRebuildQueueStatus.Processing,
      })
      .delete()
      .returning('id');
    return deletedRows.length;
  },

  recoverStuckProcessingEntries: async (): Promise<ManifestRebuildQueue[]> => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckRows = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .where({ status: ManifestRebuildQueueStatus.Processing })
      .where('created_at', '<', thirtyMinutesAgo);

    const recovered: ManifestRebuildQueue[] = [];
    for (const row of stuckRows) {
      try {
        const [updated] = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
          .where({ id: row.id })
          .update({ status: ManifestRebuildQueueStatus.Pending })
          .returning('*');
        if (updated) recovered.push(updated);
      } catch (error) {
        // A pending sibling already covers this rebuild; drop the stale row.
        if (
          !isUniqueConstraintViolation(
            error,
            'manifestrebuildqueue_product_version_type_status_unique'
          )
        ) {
          throw error;
        }
        await db<ManifestRebuildQueue>('ManifestRebuildQueue')
          .where({ id: row.id })
          .delete();
      }
    }
    return recovered;
  },

  loadManifests: async (
    product: PlatformIdentifier,
    version: string,
    type: ManifestType,
    count: number
  ): Promise<Pick<Manifest, 'created_at' | 'name'>[]> => {
    const safeCount = Math.min(Math.max(count, 1), MANIFEST_LIST_MAX_COUNT);

    return db<Manifest>('Manifest')
      .select('created_at', 'name')
      .where({ product, version, type })
      .orderBy([
        { column: 'created_at', order: 'desc' },
        { column: 'id', order: 'desc' },
      ])
      .limit(safeCount);
  },

  getManifestByName: async (
    product: PlatformIdentifier,
    version: string,
    type: ManifestType,
    name: string
  ): Promise<Pick<Manifest, 'name' | 'created_at'> | undefined> => {
    return db<Manifest>('Manifest')
      .select('name', 'created_at')
      .where({ product, version, type, name })
      .first();
  },
};
