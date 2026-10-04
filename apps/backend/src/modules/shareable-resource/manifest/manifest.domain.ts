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

  loadPendingRebuildKeys: async (
    createdBefore?: Date
  ): Promise<ManifestKey[]> => {
    const query = db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .distinct('product', 'version', 'type')
      .where({ status: ManifestRebuildQueueStatus.Pending });
    if (createdBefore) {
      query.andWhere('created_at', '<', createdBefore);
    }
    const rows = await query;
    return rows.map(({ product, version, type }) => ({
      platformIdentifier: product,
      version,
      type,
    }));
  },

  /** Claims the pending requests for `claimId`: completion and failure then only act on this claim. */
  loadPendingManifestsForProcessing: async (
    filter: ManifestKey | undefined,
    claimId: string
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
      .update({
        status: ManifestRebuildQueueStatus.Processing,
        claimed_at: new Date(),
        claim_id: claimId,
      })
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

  /** Completes the processing request of `key`; with a `claimId`, only when that claim still owns it. */
  deleteFromRebuildQueue: async (
    { platformIdentifier, version, type }: ManifestKey,
    claimId?: string
  ): Promise<number> => {
    // .returning('id') is required here: a bare .delete() result is a plain
    // number, which postProcessResponse silently turns into undefined.
    const deletedRows = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .where({
        product: platformIdentifier,
        version,
        type,
        status: ManifestRebuildQueueStatus.Processing,
        ...(claimId ? { claim_id: claimId } : {}),
      })
      .delete()
      .returning('id');
    return deletedRows.length;
  },

  /**
   * Puts a failed rebuild back in the queue when `claimId` still owns it,
   * unless a pending request already covers its key.
   */
  returnToPending: async (
    { platformIdentifier, version, type }: ManifestKey,
    claimId: string
  ): Promise<void> => {
    const processing = {
      product: platformIdentifier,
      version,
      type,
      status: ManifestRebuildQueueStatus.Processing,
      claim_id: claimId,
    };
    try {
      await db<ManifestRebuildQueue>('ManifestRebuildQueue')
        .where(processing)
        .update({
          status: ManifestRebuildQueueStatus.Pending,
          claimed_at: null,
          claim_id: null,
        });
    } catch (error) {
      if (
        !isUniqueConstraintViolation(
          error,
          'manifestrebuildqueue_product_version_type_status_unique'
        )
      ) {
        throw error;
      }
      await db<ManifestRebuildQueue>('ManifestRebuildQueue')
        .where(processing)
        .delete();
    }
  },

  /**
   * Releases the claims older than 30 minutes, aged from the claim itself
   * (rows claimed before claims were recorded fall back to their creation).
   */
  recoverStuckProcessingEntries: async (): Promise<ManifestRebuildQueue[]> => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckRows = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
      .where({ status: ManifestRebuildQueueStatus.Processing })
      .whereRaw('COALESCE("claimed_at", "created_at") < ?', [thirtyMinutesAgo]);

    const recovered: ManifestRebuildQueue[] = [];
    for (const row of stuckRows) {
      try {
        const [updated] = await db<ManifestRebuildQueue>('ManifestRebuildQueue')
          .where({
            id: row.id,
            status: ManifestRebuildQueueStatus.Processing,
          })
          .whereRaw('"claim_id" IS NOT DISTINCT FROM ?', [row.claim_id])
          .update({
            status: ManifestRebuildQueueStatus.Pending,
            claimed_at: null,
            claim_id: null,
          })
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
