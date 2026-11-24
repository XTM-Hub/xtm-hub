import { Express, Request, Response } from 'express';
import { requestContext } from '../../../context/request.context';
import {
  BlogpostSyncCounts,
  NewsFeedApp,
} from '../../../modules/news-feed/news-feed.app';
import { SYSTEM_USER_CONTEXT } from '../../../portal.const';
import {
  isValidSystemToken,
  SYSTEM_TOKEN_HEADER,
} from '../../../security/system-token';
import { logApp } from '../../../utils/app-logger.util';
import { newsFeedBlogpostSyncRateLimiter } from '../../../utils/rate-limit.util';

const NEWS_FEED_BLOGPOST_SYNC_PATH = '/webhooks/news-feed/blogposts';
// Nothing about the failure is revealed to the caller: the details stay in the logs
const SYNC_FAILURE_MESSAGE = 'Unable to synchronize blog posts';

// A missing and a wrong token get the same answer, without any body
const sendUnauthorized = (res: Response): void => {
  res.status(401).end();
};

// The one allowlist of what leaves the Hub: the counts, nothing else of the app result
const toCounts = ({
  created,
  updated,
  dropped,
  provisionedPlatforms,
}: BlogpostSyncCounts): BlogpostSyncCounts => ({
  created,
  updated,
  dropped,
  provisionedPlatforms,
});

export const NewsFeedBlogpostSyncEndpoint = {
  sync: async (req: Request, res: Response): Promise<void> => {
    if (!isValidSystemToken(req.header(SYSTEM_TOKEN_HEADER) ?? null)) {
      sendUnauthorized(res);
      return;
    }

    try {
      // No session, like the crons: the sync runs as the system user, the system token is the only authorization.
      // The request body is ignored.
      const result = await requestContext.run(SYSTEM_USER_CONTEXT, () =>
        NewsFeedApp.syncBlogposts()
      );
      res.status(200).json({
        ...toCounts(result),
        products: Object.fromEntries(
          Object.entries(result.products).map(([product, counts]) => [
            product,
            toCounts(counts),
          ])
        ),
      });
    } catch (error) {
      // The caller only gets a generic message. When a product fails, the app has already logged the failure with its
      // product and post id, and the error carries the first failure as its cause.
      logApp.error('Error while synchronizing blog posts', { error });
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
