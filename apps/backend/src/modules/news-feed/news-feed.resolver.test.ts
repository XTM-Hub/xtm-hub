import express from 'express';
import { GraphQLObjectType } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import { NewsFeedItemMetadataKey } from '../../__generated__/resolvers-types';
import type DeploymentRequest from '../../model/kanel/public/DeploymentRequest';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { UserLoadUserBy } from '../../model/user';
import createSchema from '../../server/graphql-schema';
import {
  BadRequestErrorCode,
  ErrorCode,
  UnauthenticatedErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';
import { DeploymentRequestDomain } from '../deployment/deployment.domain';
import { NewsFeedApp } from './news-feed.app';
import { NewsFeedDomain } from './news-feed.domain';
import newsFeedResolver from './news-feed.resolver';

const makeMockContext = (headers: Record<string, string>) => ({
  req: { headers } as unknown as express.Request,
  res: {} as express.Response,
  user: undefined as unknown as UserLoadUserBy,
});

describe('consume provisioned news feed items GraphQL mutation', () => {
  let platformCaller: Awaited<
    ReturnType<typeof TestHelper.platformCaller.create>
  >;

  beforeEach(async () => {
    platformCaller = await TestHelper.platformCaller.create();
  });

  afterEach(async () => {
    await platformCaller.cleanup();
  });

  it('should consume provisioned news feed items with the platform caller checked by the guard and return the result', async () => {
    // Given
    const mockResult = { news_feed_items: [], available_news_feed_types: [] };
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems').mockResolvedValue(
      mockResult
    );
    const context = makeMockContext(platformCaller.headers);

    // When
    const result = await newsFeedResolver.Mutation!
      .consumeProvisionedNewsFeedItems!({}, {}, context, GRAPHQL_RESOLVE_INFO);

    // Then
    expect(NewsFeedApp.consumeProvisionedNewsFeedItems).toHaveBeenCalledWith({
      registration: expect.objectContaining({
        platformConfiguration: expect.objectContaining({
          platform_id: platformCaller.platformId,
          service_instance_id: platformCaller.serviceInstanceId,
        }),
        platformIdentifier: 'opencti',
      }),
    });
    expect(result).toBe(mockResult);
  });

  it('should refuse with UNAUTHENTICATED and not consume anything when the platform id header is missing', async () => {
    // Given
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems');
    const context = makeMockContext({
      'xtm-hub-platform-token': platformCaller.token,
    });

    // When
    const call = newsFeedResolver.Mutation!.consumeProvisionedNewsFeedItems!(
      {},
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      message: UnauthenticatedErrorCode.Unauthenticated,
    });
    expect(NewsFeedApp.consumeProvisionedNewsFeedItems).not.toHaveBeenCalled();
  });

  it('should refuse with UNAUTHENTICATED and not consume anything when the token is wrong', async () => {
    // Given
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems');
    const context = makeMockContext({
      ...platformCaller.headers,
      'xtm-hub-platform-token': uuidv4(),
    });

    // When
    const call = newsFeedResolver.Mutation!.consumeProvisionedNewsFeedItems!(
      {},
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      message: UnauthenticatedErrorCode.Unauthenticated,
      data: { http_status: 401 },
    });
    expect(NewsFeedApp.consumeProvisionedNewsFeedItems).not.toHaveBeenCalled();
  });

  it('should refuse with PLATFORM_NOT_REGISTERED and not consume anything when the caller only holds a deployment request token', async () => {
    // Given
    const platformId = uuidv4();
    const token = uuidv4();
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems');
    vi.spyOn(
      DeploymentRequestDomain,
      'loadDeploymentRequestBy'
    ).mockResolvedValue({
      platform_id: platformId,
      platform_token: token,
      organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    } as DeploymentRequest);
    const context = makeMockContext({
      'xtm-hub-platform-id': platformId,
      'xtm-hub-platform-token': token,
    });

    // When
    const call = newsFeedResolver.Mutation!.consumeProvisionedNewsFeedItems!(
      {},
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      message: BadRequestErrorCode.PlatformNotRegistered,
    });
    expect(NewsFeedApp.consumeProvisionedNewsFeedItems).not.toHaveBeenCalled();
  });

  it('should throw a mapped GraphQL error with UnknownError when the app throws', async () => {
    // Given
    vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems').mockRejectedValue(
      new Error('UNEXPECTED')
    );
    const context = makeMockContext(platformCaller.headers);

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
      contextBypassUser,
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
      contextBypassUser,
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
      contextBypassUser,
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
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toThrow(UnknownErrorCode.UnknownError);
  });

  it('should throw the mapped forbidden error when the item is a blog post', async () => {
    // Given
    vi.spyOn(NewsFeedApp, 'deleteNewsFeedItem').mockRejectedValue(
      new Error(ErrorCode.CantDeleteBlogpostNewsFeedItem)
    );

    // When
    const call = newsFeedResolver.Mutation!.deleteNewsFeedItem!(
      {},
      { id: 'blog-post-id' as NewsFeedItemId },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      message: ErrorCode.CantDeleteBlogpostNewsFeedItem,
      data: { http_status: 403 },
    });
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

describe('news feed GraphQL schema', () => {
  // The key of an item is its identity for the Hub only: a column that no type declares is never returned
  it.each([
    [
      'NewsFeedItem',
      [
        'creation_date',
        'id',
        'is_deleted',
        'metadata',
        'tags',
        'title',
        'type',
      ],
    ],
    [
      'ProvisionedNewsFeedItem',
      [
        'creation_date',
        'id',
        'is_deleted',
        'metadata',
        'tags',
        'title',
        'type',
      ],
    ],
  ])('should not expose the key of the %s type', (typeName, expectedFields) => {
    // When
    const type = createSchema().getType(typeName) as GraphQLObjectType;

    // Then
    expect(Object.keys(type.getFields()).sort()).toEqual(expectedFields);
  });
});
