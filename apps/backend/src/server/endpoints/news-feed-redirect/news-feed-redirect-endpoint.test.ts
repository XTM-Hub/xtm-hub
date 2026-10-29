import config from 'config';
import express from 'express';
import expressSession, {
  MemoryStore,
  type SessionData,
  type SessionOptions,
} from 'express-session/index.js';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextSimpleUserFiligran2,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
} from '../../../__generated__/resolvers-types';
import { NewsFeedDomain } from '../../../modules/news-feed/news-feed.domain';
import { TelemetryApp } from '../../../modules/telemetry/telemetry.app';
import {
  TelemetryNewsFeedItemType,
  TelemetryOrganizationType,
} from '../../../modules/telemetry/telemetry.const';
import { TelemetryEventType } from '../../../modules/telemetry/telemetry.types';
import { logApp } from '../../../utils/app-logger.util';
import { ReadOnlySessionStore } from '../../session/read-only-session.store';
import { newsFeedRedirectEndpoint } from './news-feed-redirect-endpoint';

const BLOG_POST_SLUG = 'threat-report-2026';
const BLOG_POST_URL = `${config.get<string>('blog_api.base_url')}/blog/${BLOG_POST_SLUG}`;
const PLATFORM_ID = '9b0c7a3e-1111-4a9e-8d6f-0d4f5a7c9e10';
const UNKNOWN_ITEM_ID = '3f8d0c1e-2b7a-4d65-8e19-5a4c6b7d8e90';
const HUB_ROOT = '/';
const RATE_LIMIT = 60;
const SESSION_COOKIE_NAME = 'news-feed-redirect-test';
const LOGIN_PATH = '/test-login';
const CLIENT_IP_HEADER = 'x-test-client-ip';

const sessionStore = new MemoryStore();
const SESSION_OPTIONS: SessionOptions = {
  name: SESSION_COOKIE_NAME,
  secret: 'news-feed-redirect-test-secret',
  saveUninitialized: false,
  resave: false,
  proxy: true,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 1000 },
};

const buildApp = () => {
  const app = express();
  // Test only: gives every test its own client address, so that the rate limit buckets stay independent
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'ip', { value: req.headers[CLIENT_IP_HEADER] });
    next();
  });
  // Same wiring as the real app: the redirect route is registered with its read only session, before the session
  // middleware that every other route goes through
  newsFeedRedirectEndpoint(
    app,
    expressSession({
      ...SESSION_OPTIONS,
      store: new ReadOnlySessionStore(sessionStore),
    })
  );
  app.use(expressSession({ ...SESSION_OPTIONS, store: sessionStore }));
  // Test only: logs a user in the way the real login flow does, to get a session cookie
  app.get(LOGIN_PATH, (req, res) => {
    req.session.user = contextSimpleUserFiligran2.user;
    res.status(204).end();
  });
  return app;
};

let server: Server;
let baseUrl: string;
let nextClientIp = 1;

// Every test uses its own client IP (through a test header) so that the rate limit buckets stay independent
const newClientIp = () => `10.20.0.${nextClientIp++}`;

const request = (
  path: string,
  { ip = newClientIp(), cookie }: { ip?: string; cookie?: string } = {}
) =>
  fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: {
      [CLIENT_IP_HEADER]: ip,
      ...(cookie ? { cookie } : {}),
    },
  });

const redirectPath = (itemId: string, query = '') =>
  `/redirect/news-feed/${itemId}${query}`;

const summarize = async (response: Response) => ({
  status: response.status,
  location: response.headers.get('location'),
  cacheControl: response.headers.get('cache-control'),
  setCookie: response.headers.getSetCookie(),
  body: await response.text(),
});

const createBlogPostItem = async ({
  slug,
  isDeleted = false,
  type = NewsFeedItemType.BlogPost,
}: {
  slug?: string;
  isDeleted?: boolean;
  type?: NewsFeedItemType;
} = {}) => {
  const item = await TestHelper.newsFeed.createItem({
    type,
    title: 'Blog post',
    is_deleted: isDeleted,
  });
  if (slug !== undefined) {
    await TestHelper.newsFeed.createMetadata({
      news_feed_item_id: item.id,
      key: NewsFeedItemMetadataKey.BlogPostSlug,
      value: slug,
    });
  }
  return item;
};

const loginAndGetCookie = async (): Promise<string> => {
  const response = await request(LOGIN_PATH);
  const [setCookie] = response.headers.getSetCookie();
  return setCookie!.split(';')[0]!;
};

const loadSessions = () =>
  new Promise<Record<string, SessionData>>((resolve, reject) => {
    sessionStore.all((error, sessions) =>
      error ? reject(error) : resolve(sessions ?? {})
    );
  });

const clearSessions = () =>
  new Promise<void>((resolve, reject) => {
    sessionStore.clear((error) => (error ? reject(error) : resolve()));
  });

describe('news feed redirect endpoint', () => {
  beforeAll(async () => {
    server = createServer(buildApp());
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await TestHelper.newsFeed.deleteItem();
    await clearSessions();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('redirect', () => {
    it('should answer a 302 with no-store to the destination built from the item type and metadata', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      vi.spyOn(TelemetryApp, 'sendTelemetryEvent').mockResolvedValue(undefined);

      // When
      const response = await request(redirectPath(item.id));

      // Then
      expect(await summarize(response)).toMatchObject({
        status: 302,
        location: BLOG_POST_URL,
        cacheControl: 'no-store',
      });
    });

    it('should forward the utm parameters only, and ignore any destination given by the request', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      vi.spyOn(TelemetryApp, 'sendTelemetryEvent').mockResolvedValue(undefined);
      const query = `?utm_source=opencti&utm_medium=newsfeed&utm_campaign=blog_posts&utm_content=blog_posts&platform_id=${PLATFORM_ID}&url=https://evil.example&redirect=https://evil.example&host=evil.example`;

      // When
      const response = await request(redirectPath(item.id, query));

      // Then
      expect(response.headers.get('location')).toBe(
        `${BLOG_POST_URL}?utm_source=opencti&utm_medium=newsfeed&utm_campaign=blog_posts&utm_content=blog_posts`
      );
    });
  });

  describe('hub root fallback', () => {
    // The unsafe values are exhaustively covered by the redirect helper tests
    const refusalCases: [string, () => Promise<string>][] = [
      ['a malformed id', async () => 'not-a-uuid'],
      ['an unknown item', async () => UNKNOWN_ITEM_ID],
      [
        'a deleted item',
        async () =>
          (await createBlogPostItem({ slug: BLOG_POST_SLUG, isDeleted: true }))
            .id,
      ],
      [
        'an item type without a builder',
        async () =>
          (
            await createBlogPostItem({
              slug: BLOG_POST_SLUG,
              type: NewsFeedItemType.ResourcePlaybook,
            })
          ).id,
      ],
      [
        'an item without the metadata of its destination',
        async () => (await createBlogPostItem()).id,
      ],
      ...['a/b', '..', 'a%2fb'].map((slug): [string, () => Promise<string>] => [
        `invalid metadata "${slug}"`,
        async () => (await createBlogPostItem({ slug })).id,
      ]),
    ];

    it.each(refusalCases)(
      'should answer the same 302 to the hub root for %s',
      async (_description, createItemId) => {
        // Given
        const reference = await summarize(
          await request(redirectPath('another-malformed-id'))
        );
        const itemId = await createItemId();
        const sendTelemetryEvent = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockResolvedValue(undefined);

        // When
        const response = await summarize(
          await request(redirectPath(itemId, `?platform_id=${PLATFORM_ID}`))
        );

        // Then
        expect(response).toEqual(reference);
        expect(response).toMatchObject({
          status: 302,
          location: HUB_ROOT,
          cacheControl: 'no-store',
          setCookie: [],
        });
        expect(sendTelemetryEvent).not.toHaveBeenCalled();
      }
    );

    it('should answer the hub root when resolving the item fails', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
      vi.spyOn(TelemetryApp, 'sendTelemetryEvent').mockResolvedValue(undefined);
      const reference = await summarize(
        await request(redirectPath('another-malformed-id'))
      );
      vi.spyOn(
        NewsFeedDomain,
        'loadNewsFeedItemWithMetadataById'
      ).mockRejectedValue(new Error('database down'));

      // When
      const response = await summarize(await request(redirectPath(item.id)));

      // Then
      expect(response).toEqual(reference);
    });
  });

  describe('rate limit', () => {
    it('should answer a 429 above the limit, with the throttled warning log and no telemetry event', async () => {
      // Given
      const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
      const sendTelemetryEvent = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue(undefined);
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      const ip = newClientIp();
      for (let i = 0; i < RATE_LIMIT; i++) {
        expect((await request(redirectPath('not-a-uuid'), { ip })).status).toBe(
          302
        );
      }

      // When
      const limited = await request(redirectPath('not-a-uuid'), { ip });
      const limitedAgain = await request(redirectPath(item.id), { ip });

      // Then
      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({
        code: 429,
        message: 'Too many requests, please try again later',
      });
      expect(limitedAgain.status).toBe(429);
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith(
        '[RATE-LIMIT] News feed redirect request rate limited',
        expect.objectContaining({ ip, limit: RATE_LIMIT })
      );
      expect(sendTelemetryEvent).not.toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    it('should emit exactly one anonymous news_feed_redirect event without a session', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      const sendTelemetryEvent = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue(undefined);

      // When
      const response = await request(
        redirectPath(item.id, `?platform_id=${PLATFORM_ID}`)
      );

      // Then
      expect(response.status).toBe(302);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(Object.keys(await loadSessions())).toHaveLength(0);
      await vi.waitFor(() =>
        expect(sendTelemetryEvent).toHaveBeenCalledTimes(1)
      );
      expect(sendTelemetryEvent.mock.calls[0]![0]).toMatchObject({
        event_type: TelemetryEventType.NEWS_FEED_REDIRECT,
        news_feed_item_id: item.id,
        news_feed_item_type: TelemetryNewsFeedItemType.BLOG_POST,
        destination_host: new URL(config.get<string>('blog_api.base_url'))
          .hostname,
        platform_id: PLATFORM_ID,
        organization_type: TelemetryOrganizationType.PUBLIC,
        organization_id: undefined,
        organization_name: undefined,
        user_id: undefined,
      });
    });

    it('should emit the event with the user and the organization, and leave the session untouched, when the request carries a valid session', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      const sendTelemetryEvent = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue(undefined);
      const cookie = await loginAndGetCookie();
      const sessionsBefore = await loadSessions();
      // The stores written by a real session (PostgreSQL) renew the session on `touch`: neither must be called
      const setSpy = vi.spyOn(sessionStore, 'set');
      const touchSpy = vi.spyOn(sessionStore, 'touch');
      const destroySpy = vi.spyOn(sessionStore, 'destroy');

      // When
      const response = await request(redirectPath(item.id), { cookie });

      // Then
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(BLOG_POST_URL);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(setSpy).not.toHaveBeenCalled();
      expect(touchSpy).not.toHaveBeenCalled();
      expect(destroySpy).not.toHaveBeenCalled();
      expect(await loadSessions()).toEqual(sessionsBefore);
      await vi.waitFor(() =>
        expect(sendTelemetryEvent).toHaveBeenCalledTimes(1)
      );
      expect(sendTelemetryEvent.mock.calls[0]![0]).toMatchObject({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
      });
    });

    it('should neither create a session nor set a cookie with an unknown session cookie', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      const sendTelemetryEvent = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue(undefined);

      // When
      const response = await request(redirectPath(item.id), {
        cookie: `${SESSION_COOKIE_NAME}=s%3Aunknown-session.invalid-signature`,
      });

      // Then
      expect(response.status).toBe(302);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(Object.keys(await loadSessions())).toHaveLength(0);
      await vi.waitFor(() =>
        expect(sendTelemetryEvent).toHaveBeenCalledTimes(1)
      );
      expect(sendTelemetryEvent.mock.calls[0]![0]).toMatchObject({
        organization_type: TelemetryOrganizationType.PUBLIC,
        user_id: undefined,
      });
    });

    it('should not change the response when the telemetry fails', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
      const sendTelemetryEvent = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValueOnce(undefined);
      const reference = await summarize(await request(redirectPath(item.id)));
      sendTelemetryEvent.mockRejectedValue(new Error('telemetry down'));

      // When
      const response = await summarize(await request(redirectPath(item.id)));

      // Then
      expect(response).toEqual(reference);
      await vi.waitFor(() =>
        expect(sendTelemetryEvent).toHaveBeenCalledTimes(2)
      );
    });

    it('should not wait for the telemetry to answer', async () => {
      // Given
      const item = await createBlogPostItem({ slug: BLOG_POST_SLUG });
      vi.spyOn(TelemetryApp, 'sendTelemetryEvent').mockReturnValue(
        new Promise<void>(() => undefined)
      );

      // When
      const response = await request(redirectPath(item.id));

      // Then
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(BLOG_POST_URL);
    });
  });
});
