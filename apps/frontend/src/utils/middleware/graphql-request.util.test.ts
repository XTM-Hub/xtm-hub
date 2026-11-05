import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { manageRequest, SERVER_HTTP_API } from './graphql-request.util';

const BASE_URL = 'http://localhost:3002';
const ITEM_ID = '0b7f7d2e-4c1a-4b8e-9a53-6f1f3c2d1e00';

const manage = (pathAndQuery: string) =>
  manageRequest(new NextRequest(`${BASE_URL}${pathAndQuery}`));

describe('manageRequest news feed redirect', () => {
  it.each([
    [`/redirect/news-feed/${ITEM_ID}`],
    [
      `/redirect/news-feed/${ITEM_ID}?platform_id=platform-1&utm_medium=newsfeed`,
    ],
  ])(
    'should rewrite %s to the API with its path and query',
    async (pathAndQuery: string) => {
      // Given a public news feed redirect request

      // When
      const response = await manage(pathAndQuery);

      // Then
      expect(response?.headers.get('x-middleware-rewrite')).toBe(
        `${SERVER_HTTP_API}${pathAndQuery}`
      );
    }
  );

  it.each([
    ['/redirect/news-feed'],
    [`/redirect/news-feed/${ITEM_ID}/extra`],
    ['/redirect/opencti_custom_dashboards?document_id=doc-1'],
    [`/app/redirect/news-feed/${ITEM_ID}`],
  ])('should leave %s to the app routes', async (pathAndQuery: string) => {
    // Given a request that is not the public news feed redirect

    // When
    const response = await manage(pathAndQuery);

    // Then
    expect(response).toBeUndefined();
  });
});

describe('manageRequest news feed blogpost sync webhook', () => {
  it.each([
    ['/webhooks/news-feed/blogposts'],
    ['/webhooks/news-feed/blogposts/'],
    ['/webhooks/news-feed/blogposts?ignored=1'],
  ])(
    'should rewrite %s to the API with its path and query',
    async (pathAndQuery: string) => {
      // Given a webhook call of the blogpost sync

      // When
      const response = await manage(pathAndQuery);

      // Then
      expect(response?.headers.get('x-middleware-rewrite')).toBe(
        `${SERVER_HTTP_API}${pathAndQuery}`
      );
    }
  );

  it.each([
    ['/webhooks/news-feed'],
    ['/webhooks/news-feed/blogposts/extra'],
    ['/webhooks/news-feed/other'],
    ['/app/webhooks/news-feed/blogposts'],
  ])('should leave %s to the app routes', async (pathAndQuery: string) => {
    // Given a request that is not the blogpost sync webhook

    // When
    const response = await manage(pathAndQuery);

    // Then
    expect(response).toBeUndefined();
  });
});
