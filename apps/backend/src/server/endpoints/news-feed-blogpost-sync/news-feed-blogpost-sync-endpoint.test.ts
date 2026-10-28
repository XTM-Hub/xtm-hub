import express from 'express';
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
import { requestContext } from '../../../context/request.context';
import {
  BlogpostSyncResult,
  NewsFeedApp,
} from '../../../modules/news-feed/news-feed.app';
import { SYSTEM_USER_UUID } from '../../../portal.const';
import { SYSTEM_TOKEN_HEADER } from '../../../security/directive-graphql/validator/system-token.validator';
import {
  BlogApiError,
  BlogApiErrorCode,
} from '../../../thirdparty/blog-api/errors';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { newsFeedBlogpostSyncEndpoint } from './news-feed-blogpost-sync-endpoint';

const SYNC_PATH = '/webhooks/news-feed/blogposts';
// The dev-only default of config news_feed.blogpost_webhook_token_hash and news_feed.blogpost_webhook_token_salt
const VALID_TOKEN = 'changeMeBlogpostWebhook';
// The dev-only default of the system token, which is not valid here
const SYSTEM_TOKEN = 'changeMe';
const RATE_LIMIT = 30;
const CLIENT_IP_HEADER = 'x-test-client-ip';
const SYNC_FAILURE_BODY = { message: 'Unable to synchronize blog posts' };
const INVALID_POST_ID = 'post-614';
const INTERNAL_ERROR_MESSAGE = 'connection to 10.1.2.3:5432 refused';

const SYNC_RESULT: BlogpostSyncResult = {
  created: 1,
  updated: 2,
  dropped: 3,
  provisionedPlatforms: 4,
};

const buildApp = () => {
  const app = express();
  // Test only: gives every test its own client address, so that the rate limit buckets stay independent
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'ip', { value: req.headers[CLIENT_IP_HEADER] });
    next();
  });
  // Same wiring as the real app: the global JSON parser comes first, the endpoint is registered right after it
  app.use(express.json({ limit: '7mb' }));
  newsFeedBlogpostSyncEndpoint(app);
  return app;
};

let server: Server;
let baseUrl: string;
let nextClientIp = 1;

// Every test uses its own client IP (through a test header) so that the rate limit buckets stay independent
const newClientIp = () => `10.30.0.${nextClientIp++}`;

const callWebhook = ({
  ip = newClientIp(),
  headers = {},
  body,
}: {
  ip?: string;
  headers?: Record<string, string>;
  body?: string;
} = {}) =>
  fetch(`${baseUrl}${SYNC_PATH}`, {
    method: 'POST',
    headers: { [CLIENT_IP_HEADER]: ip, ...headers },
    body,
  });

const withToken = (token: string = VALID_TOKEN) => ({
  [SYSTEM_TOKEN_HEADER]: token,
});

const summarize = async (response: Response) => ({
  status: response.status,
  body: await response.text(),
  contentType: response.headers.get('content-type'),
  setCookie: response.headers.getSetCookie(),
});

describe('news feed blogpost sync endpoint', () => {
  beforeAll(async () => {
    server = createServer(buildApp());
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('authentication', () => {
    const refusalCases: [string, Record<string, string>][] = [
      ['a missing token', {}],
      ['an empty token', withToken('')],
      ['a wrong token', withToken('invalid-token')],
      ['the valid token with a suffix', withToken(`${VALID_TOKEN}X`)],
      ['the system token', withToken(SYSTEM_TOKEN)],
      [
        'the valid token in another header',
        { 'x-xtm-hub-marketing-token': VALID_TOKEN },
      ],
      [
        'the valid token as an authorization bearer',
        { authorization: `Bearer ${VALID_TOKEN}` },
      ],
    ];

    it.each(refusalCases)(
      'should answer the same 401 without any body when the request carries %s',
      async (_description, headers) => {
        // Given
        const syncBlogposts = vi
          .spyOn(NewsFeedApp, 'syncBlogposts')
          .mockResolvedValue(SYNC_RESULT);
        const reference = await summarize(await callWebhook());

        // When
        const response = await summarize(await callWebhook({ headers }));

        // Then
        expect(response).toEqual(reference);
        expect(response).toMatchObject({
          status: 401,
          body: '',
          contentType: null,
          setCookie: [],
        });
        expect(syncBlogposts).not.toHaveBeenCalled();
      }
    );
  });

  describe('synchronization', () => {
    it('should answer a 200 with the counts only when the token is valid', async () => {
      // Given
      vi.spyOn(NewsFeedApp, 'syncBlogposts').mockResolvedValue({
        ...SYNC_RESULT,
        // Anything else the app returns must not leak into the answer
        internal: 'not-for-the-caller',
      } as BlogpostSyncResult);

      // When
      const response = await callWebhook({ headers: withToken() });

      // Then
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(SYNC_RESULT);
    });

    it('should run the synchronization once, in a context of the system user', async () => {
      // Given
      let contextUserId: string | undefined;
      const syncBlogposts = vi
        .spyOn(NewsFeedApp, 'syncBlogposts')
        .mockImplementation(async () => {
          contextUserId = requestContext.get()?.user?.id;
          return SYNC_RESULT;
        });

      // When
      await callWebhook({ headers: withToken() });

      // Then
      expect(syncBlogposts).toHaveBeenCalledTimes(1);
      expect(contextUserId).toBe(SYSTEM_USER_UUID);
    });

    const bodies: [string, Record<string, string>, string][] = [
      [
        'a json body',
        { 'content-type': 'application/json' },
        JSON.stringify({ created: 99, token: 'not-the-token', limit: 1 }),
      ],
      [
        'a body of another type',
        { 'content-type': 'text/plain' },
        'any text sent by the caller',
      ],
    ];

    it.each(bodies)(
      'should ignore the request body when it is %s',
      async (_description, contentTypeHeader, body) => {
        // Given
        const syncBlogposts = vi
          .spyOn(NewsFeedApp, 'syncBlogposts')
          .mockResolvedValue(SYNC_RESULT);

        // When
        const response = await callWebhook({
          headers: { ...contentTypeHeader, ...withToken() },
          body,
        });

        // Then
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(SYNC_RESULT);
        expect(syncBlogposts).toHaveBeenCalledWith();
      }
    );
  });

  describe('failure', () => {
    const failureCases: [string, Error, string | undefined][] = [
      [
        'an invalid item of the blog API',
        new BlogApiError(BlogApiErrorCode.InvalidItem, INTERNAL_ERROR_MESSAGE, {
          postId: INVALID_POST_ID,
        }),
        INVALID_POST_ID,
      ],
      [
        'a failure of the blog API without a post',
        new BlogApiError(BlogApiErrorCode.Timeout, INTERNAL_ERROR_MESSAGE),
        undefined,
      ],
      [
        'the empty feed safeguard',
        new Error(ErrorCode.NewsFeedBlogpostEmptyFeed),
        undefined,
      ],
      ['any other error', new Error(INTERNAL_ERROR_MESSAGE), undefined],
    ];

    it.each(failureCases)(
      'should answer a 500 with the message only, and log the post id, when the synchronization throws %s',
      async (_description, error, expectedPostId) => {
        // Given
        const logError = vi
          .spyOn(logApp, 'error')
          .mockImplementation(() => undefined);
        vi.spyOn(NewsFeedApp, 'syncBlogposts').mockRejectedValue(error);

        // When
        const response = await summarize(
          await callWebhook({ headers: withToken() })
        );

        // Then
        expect(response).toMatchObject({
          status: 500,
          body: JSON.stringify(SYNC_FAILURE_BODY),
        });
        expect(logError).toHaveBeenCalledWith(
          'Error while synchronizing blog posts',
          { error, postId: expectedPostId }
        );
      }
    );
  });

  describe('rate limit', () => {
    it('should answer a 429 above the limit, even with the valid token, without running the synchronization', async () => {
      // Given
      const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
      const syncBlogposts = vi
        .spyOn(NewsFeedApp, 'syncBlogposts')
        .mockResolvedValue(SYNC_RESULT);
      const ip = newClientIp();
      for (let i = 0; i < RATE_LIMIT; i++) {
        expect((await callWebhook({ ip })).status).toBe(401);
      }

      // When
      const limited = await callWebhook({ ip, headers: withToken() });

      // Then
      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({
        message: 'Too many requests, please try again later',
      });
      expect(syncBlogposts).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        '[RATE-LIMIT] News feed blogpost sync request rate limited',
        expect.objectContaining({ ip, limit: RATE_LIMIT })
      );
    });

    it('should keep the limit separate for each client address', async () => {
      // Given
      vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
      vi.spyOn(NewsFeedApp, 'syncBlogposts').mockResolvedValue(SYNC_RESULT);
      const limitedIp = newClientIp();
      for (let i = 0; i <= RATE_LIMIT; i++) {
        await callWebhook({ ip: limitedIp });
      }

      // When
      const response = await callWebhook({ headers: withToken() });

      // Then
      expect(response.status).toBe(200);
    });
  });
});
