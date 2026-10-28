import config from 'config';
import { Express, Request, Response } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { requestContext } from '../../../context/request.context';
import { NewsFeedApp } from '../../../modules/news-feed/news-feed.app';
import { SYSTEM_USER_CONTEXT } from '../../../portal.const';
import { SYSTEM_TOKEN_HEADER } from '../../../security/directive-graphql/validator/system-token.validator';
import { validatePassword } from '../../../security/util/user';
import { BlogApiError } from '../../../thirdparty/blog-api/errors';
import { logApp } from '../../../utils/app-logger.util';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';

const NEWS_FEED_BLOGPOST_SYNC_PATH = '/webhooks/news-feed/blogposts';
// Called by n8n on every blog post change, a few times a minute at most
const NEWS_FEED_BLOGPOST_SYNC_RATE_WINDOW_MS = 60 * 1000;
const NEWS_FEED_BLOGPOST_SYNC_RATE_MAX = 30;

const NEWS_FEED_BLOGPOST_WEBHOOK_TOKEN_HASH = config.get<string>(
  'news_feed.blogpost_webhook_token_hash'
);
const NEWS_FEED_BLOGPOST_WEBHOOK_TOKEN_SALT = config.get<string>(
  'news_feed.blogpost_webhook_token_salt'
);

// Nothing about the failure is revealed to the caller: the details stay in the logs
const SYNC_FAILURE_MESSAGE = 'Unable to synchronize blog posts';

export const buildNewsFeedBlogpostSyncRateLimiterOptions =
  (): Partial<Options> =>
    buildIpRateLimiterOptions({
      windowMs: NEWS_FEED_BLOGPOST_SYNC_RATE_WINDOW_MS,
      limit: NEWS_FEED_BLOGPOST_SYNC_RATE_MAX,
      logLabel: 'News feed blogpost sync',
      sendRateLimitError: (res) => {
        res.status(429).json({
          message: 'Too many requests, please try again later',
        });
      },
    });

const newsFeedBlogpostSyncRateLimiter = rateLimit(
  buildNewsFeedBlogpostSyncRateLimiterOptions()
);

// The dedicated token, not the system token. The input is hashed before the comparison, so it needs no constant-time
// wrapper.
const isValidWebhookToken = (token: string | undefined): boolean =>
  !!token &&
  validatePassword(
    NEWS_FEED_BLOGPOST_WEBHOOK_TOKEN_SALT,
    token,
    NEWS_FEED_BLOGPOST_WEBHOOK_TOKEN_HASH
  );

// A missing and a wrong token get the same answer, without any body
const sendUnauthorized = (res: Response): void => {
  res.status(401).end();
};

export const NewsFeedBlogpostSyncEndpoint = {
  sync: async (req: Request, res: Response): Promise<void> => {
    if (!isValidWebhookToken(req.header(SYSTEM_TOKEN_HEADER))) {
      sendUnauthorized(res);
      return;
    }

    try {
      // No session, like the crons: the sync runs as the system user. The request body is ignored.
      const result = await requestContext.run(SYSTEM_USER_CONTEXT, () =>
        NewsFeedApp.syncBlogposts()
      );
      res.status(200).json({
        created: result.created,
        updated: result.updated,
        dropped: result.dropped,
        provisionedPlatforms: result.provisionedPlatforms,
      });
    } catch (error) {
      // The post id of an invalid item stays in the logs, it is never sent back to the caller
      logApp.error('Error while synchronizing blog posts', {
        error,
        postId: error instanceof BlogApiError ? error.postId : undefined,
      });
      res.status(500).json({ message: SYNC_FAILURE_MESSAGE });
    }
  },
};

export const newsFeedBlogpostSyncEndpoint = (app: Express) => {
  // The rate limit comes first, so that the token cannot be guessed at will
  app.post(
    NEWS_FEED_BLOGPOST_SYNC_PATH,
    newsFeedBlogpostSyncRateLimiter,
    NewsFeedBlogpostSyncEndpoint.sync
  );
};
