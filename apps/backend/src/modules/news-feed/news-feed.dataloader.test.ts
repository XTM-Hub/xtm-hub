import { describe, expect, it, vi } from 'vitest';
import { NewsFeedItemMetadataKey } from '../../__generated__/resolvers-types';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import NewsFeedItemMetadata from '../../model/kanel/public/NewsFeedItemMetadata';
import { NewsFeedDataLoader } from './news-feed.dataloader';
import { NewsFeedDomain } from './news-feed.domain';

describe('newsFeedDataLoader', () => {
  it('should group metadata by news feed item id and return an empty array when missing', async () => {
    vi.spyOn(NewsFeedDomain, 'loadMetadataByNewsFeedItemIds').mockResolvedValue(
      [
        {
          news_feed_item_id: 'item-1' as NewsFeedItemId,
          key: NewsFeedItemMetadataKey.UrlPath,
          value: 'redirect/foo',
        },
        {
          news_feed_item_id: 'item-1' as NewsFeedItemId,
          key: NewsFeedItemMetadataKey.UrlPath,
          value: 'redirect/bar',
        },
      ] as NewsFeedItemMetadata[]
    );

    const result = await NewsFeedDataLoader.batchLoadMetadataByNewsFeedItemId([
      'item-1' as NewsFeedItemId,
      'item-2' as NewsFeedItemId,
    ]);

    expect(NewsFeedDomain.loadMetadataByNewsFeedItemIds).toHaveBeenCalledWith([
      'item-1',
      'item-2',
    ]);
    expect(result).toEqual([
      [
        {
          news_feed_item_id: 'item-1',
          key: NewsFeedItemMetadataKey.UrlPath,
          value: 'redirect/foo',
        },
        {
          news_feed_item_id: 'item-1',
          key: NewsFeedItemMetadataKey.UrlPath,
          value: 'redirect/bar',
        },
      ],
      [],
    ]);
  });

  it('should wire metadataByNewsFeedItemIdLoader in create()', async () => {
    const batchLoadSpy = vi
      .spyOn(NewsFeedDataLoader, 'batchLoadMetadataByNewsFeedItemId')
      .mockResolvedValue([
        [
          {
            news_feed_item_id: 'item-1' as NewsFeedItemId,
            key: NewsFeedItemMetadataKey.UrlPath,
            value: 'redirect/foo',
          },
        ],
      ] as NewsFeedItemMetadata[][]);

    const loaders = NewsFeedDataLoader.create();
    const result = await loaders.metadataByNewsFeedItemIdLoader.load(
      'item-1' as NewsFeedItemId
    );

    expect(batchLoadSpy).toHaveBeenCalledWith(['item-1']);
    expect(result).toEqual([
      {
        news_feed_item_id: 'item-1',
        key: NewsFeedItemMetadataKey.UrlPath,
        value: 'redirect/foo',
      },
    ]);
  });
});
