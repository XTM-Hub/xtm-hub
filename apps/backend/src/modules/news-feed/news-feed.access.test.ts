import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../security-management/token/platform-token.util';
import { NewsFeedApp } from './news-feed.app';
import { NewsFeedDomain } from './news-feed.domain';

describe('consumeProvisionedNewsFeedItems mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation {
      consumeProvisionedNewsFeedItems { news_feed_items { id } }
    }`,
    guarded: () => vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems'),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: UnauthenticatedErrorCode.Unauthenticated,
      admin: UnauthenticatedErrorCode.Unauthenticated,
      platform: 'allowed',
      invalidPlatformToken: UnauthenticatedErrorCode.Unauthenticated,
      unknownPlatform: UnauthenticatedErrorCode.Unauthenticated,
      // A Bearer token is not a platform credential: the caller is anonymous, a read token is refused first
      tokenRead: ForbiddenErrorCode.ReadOnlyApiToken,
      tokenReadWrite: UnauthenticatedErrorCode.Unauthenticated,
      tokenAdmin: UnauthenticatedErrorCode.Unauthenticated,
    },
    prepare: async () => {
      const platformCaller = await TestHelper.platformCaller.create();
      return {
        variables: {},
        expectedData: {
          consumeProvisionedNewsFeedItems: { news_feed_items: [] },
        },
        platformCredentials: platformCaller,
        cleanup: platformCaller.cleanup,
      };
    },
  });
});

describe('consumeProvisionedNewsFeedItems mutation with a keyed registration', () => {
  const executeAsPlatform = TestHelper.useGraphqlAsPlatform();
  const CONSUME = `mutation {
    consumeProvisionedNewsFeedItems { news_feed_items { id } }
  }`;
  const EMPTY_CONSUMPTION = { news_feed_items: [] };
  const cleanups: (() => Promise<void>)[] = [];

  const givenKeyedCaller = async () => {
    const caller = await TestHelper.keyedPlatformCaller.create();
    cleanups.push(caller.cleanup);
    return caller;
  };
  const assertionHeaders = TestHelper.keyedPlatformCaller.assertionHeaders;

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
  });

  it('should consume the items of the registration when the assertion is valid', async () => {
    // Given
    const caller = await givenKeyedCaller();
    const consume = vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems');

    // When
    const result = await executeAsPlatform(
      assertionHeaders(await caller.sign()),
      CONSUME
    );

    // Then
    expect(result).toMatchObject({
      data: { consumeProvisionedNewsFeedItems: EMPTY_CONSUMPTION },
    });
    expect(consume).toHaveBeenCalledExactlyOnceWith({
      registration: expect.objectContaining({
        platformConfiguration: expect.objectContaining({
          service_instance_id: caller.serviceInstanceId,
        }),
      }),
    });
  });

  it('should authenticate every field of one request with its single assertion', async () => {
    // Given
    const caller = await givenKeyedCaller();

    // When
    const result = await executeAsPlatform(
      assertionHeaders(await caller.sign()),
      `mutation {
        first: consumeProvisionedNewsFeedItems { news_feed_items { id } }
        second: consumeProvisionedNewsFeedItems { news_feed_items { id } }
      }`
    );

    // Then
    expect(result).toEqual({
      data: { first: EMPTY_CONSUMPTION, second: EMPTY_CONSUMPTION },
    });
  });

  it('should refuse with PLATFORM_ASSERTION_INVALID an assertion sent a second time', async () => {
    // Given
    const caller = await givenKeyedCaller();
    const headers = assertionHeaders(await caller.sign());
    await executeAsPlatform(headers, CONSUME);
    const consume = vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems');

    // When
    const result = await executeAsPlatform(headers, CONSUME);

    // Then
    expect(result.errors).toMatchObject([
      {
        message: UnauthenticatedErrorCode.PlatformAssertionInvalid,
        extensions: { code: UnauthenticatedErrorCode.PlatformAssertionInvalid },
      },
    ]);
    expect(consume).not.toHaveBeenCalled();
  });

  it('should refuse with PLATFORM_TOKEN_REFUSED the revoked token of a platform that enrolled a key', async () => {
    // Given
    const caller = await givenKeyedCaller();
    const consume = vi.spyOn(NewsFeedApp, 'consumeProvisionedNewsFeedItems');

    // When
    const result = await executeAsPlatform(
      {
        [PLATFORM_ID_HEADER]: caller.platformId,
        [PLATFORM_TOKEN_HEADER]: uuidv4(),
      },
      CONSUME
    );

    // Then
    expect(result.errors).toMatchObject([
      {
        message: UnauthenticatedErrorCode.PlatformTokenRefused,
        extensions: { code: UnauthenticatedErrorCode.PlatformTokenRefused },
      },
    ]);
    expect(consume).not.toHaveBeenCalled();
  });
});

describe('newsFeedItems query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query {
      newsFeedItems(first: 1) { edges { node { title } } }
    }`,
    guarded: () => vi.spyOn(NewsFeedDomain, 'loadPaginatedNewsFeedItems'),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.ForbiddenAccess,
      admin: 'allowed',
      // A platform request has no session, so the portal guard sees an anonymous caller
      platform: UnauthenticatedErrorCode.Unauthenticated,
    },
    prepare: async () => {
      // The list is ordered by creation date, newest first
      const item = await TestHelper.newsFeed.createItem({
        title: 'Access matrix news feed item',
        creation_date: new Date('2999-01-01T00:00:00.000Z'),
      });
      const platformCaller = await TestHelper.platformCaller.create();
      return {
        variables: {},
        expectedData: {
          newsFeedItems: {
            edges: [{ node: { title: 'Access matrix news feed item' } }],
          },
        },
        platformCredentials: platformCaller,
        cleanup: async () => {
          await TestHelper.newsFeed.deleteItem({ id: item.id });
          await platformCaller.cleanup();
        },
      };
    },
  });
});

describe('deleteNewsFeedItem mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($id: NewsFeedItemId!) {
      deleteNewsFeedItem(id: $id)
    }`,
    guarded: () => vi.spyOn(NewsFeedApp, 'deleteNewsFeedItem'),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.ForbiddenAccess,
      admin: 'allowed',
      // A platform request has no session, so the portal guard sees an anonymous caller
      platform: UnauthenticatedErrorCode.Unauthenticated,
    },
    prepare: async () => {
      const item = await TestHelper.newsFeed.createItem({
        title: 'Access matrix news feed item to delete',
      });
      const platformCaller = await TestHelper.platformCaller.create();
      return {
        variables: { id: item.id },
        expectedData: { deleteNewsFeedItem: true },
        platformCredentials: platformCaller,
        cleanup: async () => {
          await TestHelper.newsFeed.deleteProvisioned({
            news_feed_item_id: item.id,
          });
          await TestHelper.newsFeed.deleteItem({ id: item.id });
          await platformCaller.cleanup();
        },
      };
    },
  });
});
