import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { db, paginate } from '../../../knexfile';
import {
  NewsFeedItemConnection,
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import Document from '../../model/kanel/public/Document';
import NewsFeedItem, {
  NewsFeedItemId,
} from '../../model/kanel/public/NewsFeedItem';
import NewsFeedItemMetadata from '../../model/kanel/public/NewsFeedItemMetadata';
import { ErrorCode } from '../../utils/error/error.code';
import { newsFeedConfigurationMapping } from './news-feed.model';

export interface NewsFeedItemWithMetadata extends NewsFeedItem {
  metadata: NewsFeedItemMetadata[];
}

export const NewsFeedDomain = {
  loadAvailableNewsFeedTypes: (
    platformIdentifier: PlatformIdentifier
  ): NewsFeedItemType[] => {
    return Object.values(newsFeedConfigurationMapping)
      .filter((config) => config.platformIdentifier === platformIdentifier)
      .map((config) => config.newsFeedType);
  },

  loadAndConsumeProvisionedNewsFeedItems: async (
    platformId: string
  ): Promise<NewsFeedItemWithMetadata[]> => {
    return withTransaction(async () => {
      const deletedRows: { news_feed_item_id: NewsFeedItemId }[] = await db(
        'ProvisionedNewsFeedItem'
      )
        .where('platform_id', platformId)
        .delete()
        .returning('news_feed_item_id');
      if (deletedRows.length === 0) {
        return [];
      }

      const newsFeedItemIds = deletedRows.map(
        ({ news_feed_item_id }) => news_feed_item_id
      );

      const newsFeedItems: NewsFeedItem[] = await db<NewsFeedItem[]>(
        'NewsFeedItem'
      )
        .whereIn('id', newsFeedItemIds)
        .select('*');

      const allMetadata: NewsFeedItemMetadata[] = await db<
        NewsFeedItemMetadata[]
      >('NewsFeedItemMetadata')
        .whereIn('news_feed_item_id', newsFeedItemIds)
        .select('*');

      const metadataByItemId = allMetadata.reduce((acc, current) => {
        const existingMetadata = acc.get(current.news_feed_item_id);
        acc.set(current.news_feed_item_id, [
          ...(existingMetadata ?? []),
          current,
        ]);
        return acc;
      }, new Map<NewsFeedItemId, NewsFeedItemMetadata[]>());

      // Auto-cleanup: hard-delete is_deleted items with no remaining provisioned rows
      const deletedItemIds = newsFeedItems
        .filter((item) => item.is_deleted)
        .map((item) => item.id);
      if (deletedItemIds.length > 0) {
        await db('NewsFeedItem')
          .whereIn('id', deletedItemIds)
          .whereNotExists(
            db('ProvisionedNewsFeedItem')
              .whereRaw('?? = ??', [
                'ProvisionedNewsFeedItem.news_feed_item_id',
                'NewsFeedItem.id',
              ])
              .select('news_feed_item_id')
          )
          .delete();
      }

      return newsFeedItems.map((item) => ({
        ...item,
        metadata: metadataByItemId.get(item.id) ?? [],
      }));
    });
  },

  createResourceNewsFeedItem: async ({
    document,
    serviceDefinitionIdentifier,
    type,
    platformIdentifier,
    tags,
  }: {
    document: Document;
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
    type: NewsFeedItemType;
    platformIdentifier: PlatformIdentifier;
    tags: string[];
  }): Promise<NewsFeedItem> => {
    if (!document.name) {
      throw new Error(ErrorCode.NewsFeedItemMissingTitle);
    }
    const [newsFeedItem] = await db<NewsFeedItem>('NewsFeedItem')
      .insert({
        id: uuidv4() as NewsFeedItemId,
        type,
        platform_identifier: platformIdentifier,
        title: document.name,
        creation_date: new Date(),
        tags,
      })
      .returning('*');

    if (!newsFeedItem) {
      throw new Error(ErrorCode.NewsFeedItemNotFound);
    }

    const globalDocumentId = toGlobalId('Document', document.id);

    await db('NewsFeedItemMetadata').insert([
      {
        news_feed_item_id: newsFeedItem.id,
        key: NewsFeedItemMetadataKey.UrlPath,
        value: `redirect/${serviceDefinitionIdentifier}?document_id=${globalDocumentId}`,
      },
      {
        news_feed_item_id: newsFeedItem.id,
        key: NewsFeedItemMetadataKey.DocumentId,
        value: document.id,
      },
    ]);

    return newsFeedItem;
  },

  loadMetadataByNewsFeedItemIds: async (
    newsFeedItemIds: readonly NewsFeedItemId[]
  ): Promise<NewsFeedItemMetadata[]> => {
    return db<NewsFeedItemMetadata[]>('NewsFeedItemMetadata')
      .whereIn('news_feed_item_id', newsFeedItemIds)
      .whereNot('key', NewsFeedItemMetadataKey.DocumentId)
      .select('*');
  },

  loadNewsFeedItemByDocumentId: async (
    documentId: string
  ): Promise<NewsFeedItem | undefined> => {
    return db<NewsFeedItem>('NewsFeedItem')
      .innerJoin(
        'NewsFeedItemMetadata',
        'NewsFeedItemMetadata.news_feed_item_id',
        'NewsFeedItem.id'
      )
      .where({
        'NewsFeedItemMetadata.key': NewsFeedItemMetadataKey.DocumentId,
        'NewsFeedItemMetadata.value': documentId,
        'NewsFeedItem.is_deleted': false,
      })
      .orderBy('NewsFeedItem.creation_date', 'desc')
      .orderBy('NewsFeedItem.id', 'desc')
      .select('NewsFeedItem.*')
      .first();
  },

  updateNewsFeedItem: async (
    id: NewsFeedItemId,
    { title, tags }: { title: string; tags: string[] }
  ): Promise<NewsFeedItem | undefined> => {
    const [updated] = await db<NewsFeedItem>('NewsFeedItem')
      .where({ id })
      .update({ title, tags })
      .returning('*');
    return updated;
  },

  markNewsFeedItemAsDeleted: async (
    id: NewsFeedItemId
  ): Promise<NewsFeedItem> => {
    const [updated] = await db<NewsFeedItem>('NewsFeedItem')
      .where({ id })
      .update({ is_deleted: true })
      .returning('*');
    if (!updated) {
      throw new Error(ErrorCode.NewsFeedItemNotFound);
    }
    return updated;
  },

  loadPaginatedNewsFeedItems: async ({
    first,
    after,
  }: {
    first: number;
    after?: string | null;
  }): Promise<NewsFeedItemConnection> => {
    return paginate<NewsFeedItem, NewsFeedItemConnection>('NewsFeedItem', {
      first,
      after: after ?? undefined,
      orderBy: 'creation_date',
      orderMode: 'desc',
    });
  },

  provisionNewsFeedItem: async (
    newsFeedItemId: NewsFeedItemId,
    platformIds: string[]
  ): Promise<void> => {
    const uniquePlatformIds = [...new Set(platformIds)];
    if (uniquePlatformIds.length === 0) {
      return;
    }

    await db('ProvisionedNewsFeedItem')
      .insert(
        uniquePlatformIds.map((platformId) => ({
          news_feed_item_id: newsFeedItemId,
          platform_id: platformId,
        }))
      )
      .onConflict(['news_feed_item_id', 'platform_id'])
      .ignore();
  },

  deleteNewsFeedItemsOlderThan: async (cutoffDate: Date): Promise<number> => {
    const deletedRows: { id: NewsFeedItemId }[] = await db('NewsFeedItem')
      .where('creation_date', '<', cutoffDate)
      .delete()
      .returning('id');
    return deletedRows.length;
  },
};
