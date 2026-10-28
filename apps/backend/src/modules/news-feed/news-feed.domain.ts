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
import type { BlogFeedItem } from '../../thirdparty/blog-api/schema';
import { ErrorCode } from '../../utils/error/error.code';
import {
  doesPlatformSupportBlogpostNewsFeed,
  NewsFeedHelper,
} from './news-feed.helper';
import {
  blogpostProductMapping,
  NEWS_FEED_INTERNAL_METADATA_KEYS,
  newsFeedConfigurationMapping,
} from './news-feed.model';

export interface NewsFeedItemWithMetadata extends NewsFeedItem {
  metadata: NewsFeedItemMetadata[];
}

export interface BlogpostReconciliation {
  created: NewsFeedItemId[];
  updated: NewsFeedItemId[];
  dropped: NewsFeedItemId[];
  restored: NewsFeedItemId[];
}

interface BlogpostMetadataRow {
  news_feed_item_id: NewsFeedItemId;
  key: NewsFeedItemMetadataKey;
  value: string;
}

interface NewsFeedItemWithSlug extends NewsFeedItem {
  slug: string;
}

// Metadata of a blogpost item. A value that is absent is omitted, so that rewriting an item makes it disappear.
const buildBlogpostMetadata = (
  newsFeedItemId: NewsFeedItemId,
  post: BlogFeedItem
): BlogpostMetadataRow[] => {
  const authorNames = post.authors.map((author) => author.name);
  const entries: [NewsFeedItemMetadataKey, string | null | undefined][] = [
    [
      NewsFeedItemMetadataKey.UrlPath,
      NewsFeedHelper.buildRedirectUrlPath(newsFeedItemId),
    ],
    [
      NewsFeedItemMetadataKey.Description,
      post.summary?.trim() ? post.summary : undefined,
    ],
    [NewsFeedItemMetadataKey.ImageUrl, post.image?.url],
    [NewsFeedItemMetadataKey.ImageAlt, post.image ? post.image.alt : undefined],
    [
      NewsFeedItemMetadataKey.AuthorNames,
      authorNames.length > 0 ? JSON.stringify(authorNames) : undefined,
    ],
    [
      NewsFeedItemMetadataKey.ReadMinutes,
      post.read_minutes != null ? String(post.read_minutes) : undefined,
    ],
    [NewsFeedItemMetadataKey.BlogPostSlug, post.slug],
  ];

  return entries.flatMap(([key, value]) =>
    value == null || value === ''
      ? []
      : [
          {
            news_feed_item_id: newsFeedItemId,
            key,
            value,
          },
        ]
  );
};

export const NewsFeedDomain = {
  // BLOG_POST is listed only for platforms whose version supports blogpost items: it is also what shows the
  // OpenCTI See all link
  loadAvailableNewsFeedTypes: (
    platformIdentifier: PlatformIdentifier,
    platformVersion?: string | null
  ): NewsFeedItemType[] => {
    const resourceTypes = Object.values(newsFeedConfigurationMapping)
      .filter((config) => config.platformIdentifier === platformIdentifier)
      .map((config) => config.newsFeedType);

    const supportsBlogpost =
      Object.values(blogpostProductMapping).includes(platformIdentifier) &&
      doesPlatformSupportBlogpostNewsFeed(platformIdentifier, platformVersion);

    return supportsBlogpost
      ? [...resourceTypes, NewsFeedItemType.BlogPost]
      : resourceTypes;
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
      .whereNotIn('key', NEWS_FEED_INTERNAL_METADATA_KEYS)
      .select('*');
  },

  loadNewsFeedItemWithMetadataById: async (
    id: NewsFeedItemId
  ): Promise<NewsFeedItemWithMetadata | undefined> => {
    const newsFeedItem = await db<NewsFeedItem>('NewsFeedItem')
      .where({ id })
      .first();
    if (!newsFeedItem) {
      return undefined;
    }
    const metadata = await db<NewsFeedItemMetadata[]>('NewsFeedItemMetadata')
      .where('news_feed_item_id', id)
      .select('*');
    return { ...newsFeedItem, metadata };
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

  countActiveBlogpostItems: async (
    platformIdentifier: PlatformIdentifier
  ): Promise<number> => {
    // pg returns the count as a string
    const [row]: { count: string | number }[] = await db('NewsFeedItem')
      .where({
        platform_identifier: platformIdentifier,
        type: NewsFeedItemType.BlogPost,
        is_deleted: false,
      })
      .count('* as count');
    return Number(row?.count ?? 0);
  },

  // Applies the desired blogposts in the current transaction, the caller owns the transaction. Existing items are
  // matched by platform identifier, type and blog_post_slug. The unique index on the slug makes an overlapping call
  // fail instead of creating a duplicate.
  reconcileBlogposts: async ({
    platformIdentifier,
    posts,
  }: {
    platformIdentifier: PlatformIdentifier;
    posts: BlogFeedItem[];
  }): Promise<BlogpostReconciliation> => {
    const desiredSlugs = posts.map((post) => post.slug);

    // The active items to compare with the desired set, and the dropped ones that may come back
    const existingItems: NewsFeedItemWithSlug[] = await db('NewsFeedItem')
      .innerJoin(
        'NewsFeedItemMetadata',
        'NewsFeedItemMetadata.news_feed_item_id',
        'NewsFeedItem.id'
      )
      .where({
        'NewsFeedItem.platform_identifier': platformIdentifier,
        'NewsFeedItem.type': NewsFeedItemType.BlogPost,
        'NewsFeedItemMetadata.key': NewsFeedItemMetadataKey.BlogPostSlug,
      })
      .andWhere((builder) =>
        builder
          .where('NewsFeedItem.is_deleted', false)
          .orWhereIn('NewsFeedItemMetadata.value', desiredSlugs)
      )
      .select('NewsFeedItem.*', 'NewsFeedItemMetadata.value as slug');
    const existingItemBySlug = new Map(
      existingItems.map((item) => [item.slug, item])
    );

    const created: NewsFeedItemId[] = [];
    const updated: NewsFeedItemId[] = [];
    const restored: NewsFeedItemId[] = [];
    const itemsToInsert: Pick<
      NewsFeedItem,
      'id' | 'type' | 'platform_identifier' | 'title' | 'creation_date' | 'tags'
    >[] = [];
    const itemsToUpdate: {
      id: NewsFeedItemId;
      title: string;
      creation_date: Date;
      tags: string[];
    }[] = [];
    const metadataToInsert: BlogpostMetadataRow[] = [];

    for (const post of posts) {
      const existingItem = existingItemBySlug.get(post.slug);
      const id = existingItem?.id ?? (uuidv4() as NewsFeedItemId);
      const fields = {
        title: post.title,
        creation_date: new Date(post.published_at),
        tags: [...new Set(post.categories.map((category) => category.label))],
      };

      if (existingItem) {
        itemsToUpdate.push({ id, ...fields });
        (existingItem.is_deleted ? restored : updated).push(id);
      } else {
        itemsToInsert.push({
          id,
          type: NewsFeedItemType.BlogPost,
          platform_identifier: platformIdentifier,
          ...fields,
        });
        created.push(id);
      }
      metadataToInsert.push(...buildBlogpostMetadata(id, post));
    }

    const desiredSlugSet = new Set(desiredSlugs);
    const dropped = existingItems
      .filter((item) => !item.is_deleted && !desiredSlugSet.has(item.slug))
      .map((item) => item.id);

    if (itemsToInsert.length > 0) {
      await db('NewsFeedItem').insert(itemsToInsert);
    }
    for (const { id, ...fields } of itemsToUpdate) {
      await db('NewsFeedItem')
        .where({ id })
        .update({ ...fields, is_deleted: false });
    }
    if (dropped.length > 0) {
      await db('NewsFeedItem')
        .whereIn('id', dropped)
        .update({ is_deleted: true });
    }

    // Replaced as a whole, so that a removed value disappears
    const rewrittenItemIds = itemsToUpdate.map(({ id }) => id);
    if (rewrittenItemIds.length > 0) {
      await db('NewsFeedItemMetadata')
        .whereIn('news_feed_item_id', rewrittenItemIds)
        .delete();
    }
    if (metadataToInsert.length > 0) {
      await db('NewsFeedItemMetadata').insert(metadataToInsert);
    }

    return { created, updated, dropped, restored };
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
