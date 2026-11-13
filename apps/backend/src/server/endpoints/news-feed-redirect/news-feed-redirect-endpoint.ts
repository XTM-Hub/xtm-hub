import { Express, Request, RequestHandler, Response } from 'express';
import {
  NewsFeedApp,
  type NewsFeedExternalRedirect,
} from '../../../modules/news-feed/news-feed.app';
import { NEWS_FEED_REDIRECT_PATH_PREFIX } from '../../../modules/news-feed/news-feed.model';
import { TelemetryApp } from '../../../modules/telemetry/telemetry.app';
import { logApp } from '../../../utils/app-logger.util';
import { newsFeedRedirectRateLimiter } from '../../../utils/rate-limit.util';

const HUB_ROOT_PATH = '/';

// Never cached, so a corrected or disabled destination takes effect right away
const sendRedirect = (res: Response, location: string): void => {
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, location);
};

// Same response whatever the reason, so the existence of an item id is not revealed
const sendHubRootRedirect = (res: Response): void =>
  sendRedirect(res, HUB_ROOT_PATH);

// Fire and forget: runs after the response is sent, so a failure is logged and never reaches the user
const emitRedirectTelemetry = (
  req: Request,
  redirect: NewsFeedExternalRedirect
): void => {
  TelemetryApp.sendExternalNewsFeedRedirectEvent({
    // Read only: the read only session middleware has already loaded an existing session, and nothing is written to it
    user: req.session?.user,
    newsFeedItemId: redirect.newsFeedItemId,
    newsFeedItemType: redirect.newsFeedItemType,
    destinationHost: redirect.host,
    platformId: req.query.platform_id,
  }).catch((error) => {
    logApp.error('Unable to send the news feed redirect event', {
      error,
      newsFeedItemId: redirect.newsFeedItemId,
    });
  });
};

export const NewsFeedRedirectEndpoint = {
  redirect: async (req: Request, res: Response): Promise<void> => {
    let redirect: NewsFeedExternalRedirect | undefined;
    try {
      redirect = await NewsFeedApp.resolveExternalRedirect({
        newsFeedItemId: String(req.params.itemId),
        query: req.query,
      });
    } catch (error) {
      logApp.error('Error while resolving the news feed redirect', { error });
    }

    if (!redirect) {
      sendHubRootRedirect(res);
      return;
    }

    sendRedirect(res, redirect.url);
    emitRedirectTelemetry(req, redirect);
  },
};

// The session middleware is the read only one: this public route never saves nor renews a session
export const newsFeedRedirectEndpoint = (
  app: Express,
  readOnlySessionMiddleware: RequestHandler
) => {
  app.get(
    `/${NEWS_FEED_REDIRECT_PATH_PREFIX}/:itemId`,
    newsFeedRedirectRateLimiter,
    readOnlySessionMiddleware,
    NewsFeedRedirectEndpoint.redirect
  );
};
