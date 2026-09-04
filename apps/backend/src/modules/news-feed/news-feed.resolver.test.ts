import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import { NewsFeedItemMetadataKey } from '../../__generated__/resolvers-types';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { UserLoadUserBy } from '../../model/user';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { NewsFeedApp } from './news-feed.app';
import { NewsFeedDomain } from './news-feed.domain';
import newsFeedResolver from './news-feed.resolver';

const makeMockContext = (platformId: string | null, token: string | null) => ({
  req: {
    headers: {
      'xtm-hub-platform-id': platformId ?? undefined,
      'xtm-hub-platform-token': token ?? undefined,
    },
  } as unknown as express.Request,
  res: {} as express.Response,
  user: undefined as unknown as UserLoadUserBy,
});

describe('consume provisioned news feed items GraphQL mutation', () => {
  it('should consume provisioned news feed items with extracted platformId and token and return the result', async () => {
    // Given
    const platformId = 'platform-abc';
    const token = 'token-xyz';
    const mockResult = { news_feed_items: [], available_news_feed_types: [] };
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems').mockResolvedValue(
      mockResult
    );
    const context = makeMockContext(platformId, token);

    // When
    const result = await newsFeedResolver.Mutation!
      .consumeProvisionedNewsFeedItems!({}, {}, context, GRAPHQL_RESOLVE_INFO);

    // Then
    expect(NewsFeedApp.consumeProvisionedNewsFeedItems).toHaveBeenCalledWith({
      platformId,
      token,
    });
    expect(result).toBe(mockResult);
  });

  it('should consume provisioned news feed items with null platformId when header is missing', async () => {
    // Given
    const token = 'token-xyz';
    const mockResult = { news_feed_items: [], available_news_feed_types: [] };
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems').mockResolvedValue(
      mockResult
    );
    const context = makeMockContext(null, token);

    // When
    await newsFeedResolver.Mutation!.consumeProvisionedNewsFeedItems!(
      {},
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(NewsFeedApp.consumeProvisionedNewsFeedItems).toHaveBeenCalledWith({
      platformId: null,
      token,
    });
  });

  it('should throw a mapped GraphQL error with UnknownError when the app throws', async () => {
    // Given
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems').mockRejectedValue(
      new Error('UNEXPECTED')
    );
    const context = makeMockContext('platform-abc', 'token-xyz');

    // When
    const call = newsFeedResolver.Mutation!.consumeProvisionedNewsFeedItems!(
      {},
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(UnknownErrorCode.UnknownError);
  });
});

describe('newsFeedItems GraphQL query', () => {
  it('should call loadPaginatedNewsFeedItems with the provided args and return the result', async () => {
    // Given
    const mockConnection = {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      },
      totalCount: 0,
    };
    vi.spyOn(NewsFeedDomain, 'loadPaginatedNewsFeedItems').mockResolvedValue(
      mockConnection
    );

    // When
    const result = await newsFeedResolver.Query!.newsFeedItems!(
      {},
      { first: 10, after: 'cursor-abc' },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(NewsFeedDomain.loadPaginatedNewsFeedItems).toHaveBeenCalledWith({
      first: 10,
      after: 'cursor-abc',
    });
    expect(result).toBe(mockConnection);
  });

  it('should throw a mapped GraphQL error with UnknownError when the domain throws', async () => {
    // Given
    vi.spyOn(NewsFeedDomain, 'loadPaginatedNewsFeedItems').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = newsFeedResolver.Query!.newsFeedItems!(
      {},
      { first: 10 },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(UnknownErrorCode.UnknownError);
  });
});

describe('deleteNewsFeedItem GraphQL mutation', () => {
  it('should call deleteNewsFeedItem with the provided id and return true', async () => {
    // Given
    const id = 'news-feed-item-id-123' as NewsFeedItemId;
    vi.spyOn(NewsFeedApp, 'deleteNewsFeedItem').mockResolvedValue(undefined);

    // When
    const result = await newsFeedResolver.Mutation!.deleteNewsFeedItem!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(NewsFeedApp.deleteNewsFeedItem).toHaveBeenCalledWith({
      newsFeedItemId: id,
    });
    expect(result).toBe(true);
  });

  it('should throw a mapped GraphQL error with UnknownError when the app throws', async () => {
    // Given
    vi.spyOn(NewsFeedApp, 'deleteNewsFeedItem').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = newsFeedResolver.Mutation!.deleteNewsFeedItem!(
      {},
      { id: 'some-id' as NewsFeedItemId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(UnknownErrorCode.UnknownError);
  });
});

describe('newsFeedItem metadata field resolver', () => {
  it('should load metadata through the newsFeed data loader and map it to the GraphQL shape', async () => {
    // Given
    const id = 'news-feed-item-id-123' as NewsFeedItemId;
    const load = vi.fn().mockResolvedValue([
      {
        news_feed_item_id: id,
        key: NewsFeedItemMetadataKey.UrlPath,
        value: 'redirect/foo',
      },
    ]);
    const context = {
      ...contextSimpleUserFiligran2,
      dataLoaders: {
        ...contextSimpleUserFiligran2.dataLoaders,
        newsFeed: { metadataByNewsFeedItemIdLoader: { load } },
      },
    };

    // When
    const result = await newsFeedResolver.NewsFeedItem!.metadata!(
      { id },
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(load).toHaveBeenCalledWith(id);
    expect(result).toEqual([
      { key: NewsFeedItemMetadataKey.UrlPath, value: 'redirect/foo' },
    ]);
  });
});
