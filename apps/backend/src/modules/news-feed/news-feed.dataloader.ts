import DataLoader from 'dataloader';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import NewsFeedItemMetadata from '../../model/kanel/public/NewsFeedItemMetadata';
import { NewsFeedDomain } from './news-feed.domain';

export interface NewsFeedDataLoaders {
  metadataByNewsFeedItemIdLoader: DataLoader<
    NewsFeedItemId,
    NewsFeedItemMetadata[]
  >;
}

export const NewsFeedDataLoader = {
  batchLoadMetadataByNewsFeedItemId: async (
    ids: readonly NewsFeedItemId[]
  ): Promise<NewsFeedItemMetadata[][]> => {
    const rows = await NewsFeedDomain.loadMetadataByNewsFeedItemIds(ids);

    const map = new Map<NewsFeedItemId, NewsFeedItemMetadata[]>();
    for (const row of rows) {
      const existing = map.get(row.news_feed_item_id) ?? [];
      existing.push(row);
      map.set(row.news_feed_item_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  create: (): NewsFeedDataLoaders => ({
    metadataByNewsFeedItemIdLoader: new DataLoader(
      NewsFeedDataLoader.batchLoadMetadataByNewsFeedItemId
    ),
  }),
};
