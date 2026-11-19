import { describe, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
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
    },
    prepare: async () => {
      const platformCaller = await TestHelper.platformCaller.create();
      return {
        variables: {},
        expectedData: {
          consumeProvisionedNewsFeedItems: { news_feed_items: [] },
        },
        platformCredentials: {
          platformId: platformCaller.platformId,
          token: platformCaller.token,
        },
        cleanup: platformCaller.cleanup,
      };
    },
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
        platformCredentials: {
          platformId: platformCaller.platformId,
          token: platformCaller.token,
        },
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
        platformCredentials: {
          platformId: platformCaller.platformId,
          token: platformCaller.token,
        },
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
