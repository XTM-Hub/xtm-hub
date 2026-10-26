import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
  PlatformIdentifier,
} from '../../src/__generated__/resolvers-types';
import NewsFeedItem, {
  NewsFeedItemId,
  NewsFeedItemInitializer,
  NewsFeedItemMutator,
} from '../../src/model/kanel/public/NewsFeedItem';
import NewsFeedItemMetadata, {
  NewsFeedItemMetadataMutator,
} from '../../src/model/kanel/public/NewsFeedItemMetadata';
import ProvisionedNewsFeedItem, {
  ProvisionedNewsFeedItemMutator,
} from '../../src/model/kanel/public/ProvisionedNewsFeedItem';

export const TestNewsfeedHelper = {
  newsFeed: {
    createItem: async (
      data: Partial<NewsFeedItemInitializer>
    ): Promise<NewsFeedItem> => {
      const [item] = await db<NewsFeedItem>('NewsFeedItem')
        .insert({
          id: uuidv4() as NewsFeedItemId,
          type: NewsFeedItemType.ResourceCustomDashboard,
          platform_identifier: PlatformIdentifier.Opencti,
          creation_date: new Date(),
          tags: [],
          ...data,
        })
        .returning('*');
      return item!;
    },
    createMetadata: async (data: {
      news_feed_item_id: NewsFeedItemId;
      key: NewsFeedItemMetadataKey;
      value: string | null;
    }): Promise<NewsFeedItemMetadata> => {
      const [metadata] = await db('NewsFeedItemMetadata')
        .insert(data)
        .returning<NewsFeedItemMetadata[]>('*');
      return metadata!;
    },
    loadItems: async (
      field: NewsFeedItemMutator = {}
    ): Promise<NewsFeedItem[]> => {
      return db<NewsFeedItem[]>('NewsFeedItem').where(field).select('*');
    },
    loadFirstItem: async (
      field: NewsFeedItemMutator = {}
    ): Promise<NewsFeedItem | undefined> => {
      return db<NewsFeedItem>('NewsFeedItem').where(field).first();
    },
    loadFirstMetadata: async (
      field: NewsFeedItemMetadataMutator
    ): Promise<NewsFeedItemMetadata | undefined> => {
      return db<NewsFeedItemMetadata>('NewsFeedItemMetadata')
        .where(field)
        .first();
    },
    loadProvisioned: async (
      field: ProvisionedNewsFeedItemMutator
    ): Promise<ProvisionedNewsFeedItem[]> => {
      return db<ProvisionedNewsFeedItem[]>('ProvisionedNewsFeedItem')
        .where(field)
        .select('*');
    },
    deleteItem: async (field: NewsFeedItemMutator = {}) => {
      await db<NewsFeedItem>('NewsFeedItem').where(field).del();
    },
  },
};
