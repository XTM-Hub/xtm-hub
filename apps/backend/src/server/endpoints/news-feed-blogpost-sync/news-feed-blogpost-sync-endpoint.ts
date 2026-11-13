import { Express, Request, Response } from 'express';
import { requestContext } from '../../../context/request.context';
import { NewsFeedApp } from '../../../modules/news-feed/news-feed.app';
import { SYSTEM_USER_CONTEXT } from '../../../portal.const';
import {
  isValidSystemToken,
  SYSTEM_TOKEN_HEADER,
} from '../../../security/directive-graphql/validator/system-token.validator';
import { BlogApiError } from '../../../thirdparty/blog-api/errors';
import { logApp } from '../../../utils/app-logger.util';
import { newsFeedBlogpostSyncRateLimiter } from '../../../utils/rate-limit.util';

const NEWS_FEED_BLOGPOST_SYNC_PATH = '/webhooks/news-feed/blogposts';
// Nothing about the failure is revealed to the caller: the details stay in the logs
const SYNC_FAILURE_MESSAGE = 'Unable to synchronize blog posts';

// A missing and a wrong token get the same answer, without any body
const sendUnauthorized = (res: Response): void => {
  res.status(401).end();
};

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
