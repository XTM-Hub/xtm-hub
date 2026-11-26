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

describe('manageRequest backend proxy', () => {
  it.each([
    ['/graphql-api', '/graphql-api'],
    [
      '/graphql-api?operationName=Settings',
      '/graphql-api?operationName=Settings',
    ],
    ['/graphql-sse?token=sse-token', '/graphql-sse?token=sse-token'],
    [
      '/auth/oidc/callback?code=auth-code',
      '/auth/oidc/callback?code=auth-code',
    ],
    ['/document/get/document-1', '/document/get/document-1'],
    ['/user/picture/user-1', '/user/picture/user-1'],
    [
      '/opencti/6.8.0/connectors/manifests',
      '/opencti/6.8.0/connectors/manifests',
    ],
    [
      '/opencti/6.8.0/connectors/manifests/latest?format=json',
      '/opencti/6.8.0/connectors/manifests/latest?format=json',
    ],
    ['/opencti/versions-matrix', '/opencti/versions-matrix'],
    [
      '/opencti/versions-matrix/6.8.0?channel=stable',
      '/opencti/versions-matrix/6.8.0?channel=stable',
    ],
  ])(
    'should rewrite %s to the API at %s',
    async (pathAndQuery: string, apiPathAndQuery: string) => {
      // Given a request the backend answers

      // When
      const response = await manage(pathAndQuery);

      // Then
      expect(response?.headers.get('x-middleware-rewrite')).toBe(
        `${SERVER_HTTP_API}${apiPathAndQuery}`
      );
    }
  );

  it.each([
    ['/'],
    ['/en/cybersecurity-solutions'],
    ['/user/profile'],
    ['/opencti/6.8.0/manifests'],
    ['/opencti/6.8.0/connectors/manifests-archive'],
    ['/versions-matrix'],
    ['/opencti/6.8.0/versions-matrix'],
  ])('should leave %s to the app routes', async (pathAndQuery: string) => {
    // Given a request that no backend route answers

    // When
    const response = await manage(pathAndQuery);

    // Then
    expect(response).toBeUndefined();
  });
});
