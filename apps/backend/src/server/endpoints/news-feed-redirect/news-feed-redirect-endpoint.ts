import { Express, Request, Response } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import {
  NewsFeedApp,
  type NewsFeedExternalRedirect,
} from '../../../modules/news-feed/news-feed.app';
import { NEWS_FEED_REDIRECT_PATH_PREFIX } from '../../../modules/news-feed/news-feed.model';
import { TelemetryApp } from '../../../modules/telemetry/telemetry.app';
import { logApp } from '../../../utils/app-logger.util';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';

// Clicks from a news feed are rare, so the limit is far below the other public endpoints
const NEWS_FEED_REDIRECT_RATE_WINDOW_MS = 60 * 1000;
const NEWS_FEED_REDIRECT_RATE_MAX = 60;

const HUB_ROOT_PATH = '/';

export const buildNewsFeedRedirectRateLimiterOptions = (): Partial<Options> =>
  buildIpRateLimiterOptions({
    windowMs: NEWS_FEED_REDIRECT_RATE_WINDOW_MS,
    limit: NEWS_FEED_REDIRECT_RATE_MAX,
    logLabel: 'News feed redirect',
    sendRateLimitError: (res) => {
      res.status(429).json({
        code: 429,
        message: 'Too many requests, please try again later',
      });
    },
  });

const newsFeedRedirectRateLimiter = rateLimit(
  buildNewsFeedRedirectRateLimiterOptions()
);

// Never cached, so a corrected or disabled destination takes effect right away
const sendRedirect = (res: Response, location: string): void => {
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, location);
};

// Same response whatever the reason, so the existence of an item id is not revealed
const sendHubRootRedirect = (res: Response): void =>
  sendRedirect(res, HUB_ROOT_PATH);

// Fire and forget: runs after the response is sent and can never change it
const emitRedirectTelemetry = (
  req: Request,
  redirect: NewsFeedExternalRedirect
): void => {
  try {
    TelemetryApp.sendExternalNewsFeedRedirectEvent({
      // Read only: the session middleware has already loaded an existing session, and nothing is ever written to it
      user: req.session?.user,
      newsFeedItemId: redirect.newsFeedItemId,
      newsFeedItemType: redirect.newsFeedItemType,
      destinationHost: redirect.host,
      platformId: req.query.platform_id,
    }).catch((error) =>
      logApp.error('Unable to emit the news feed redirect telemetry', {
        error,
      })
    );
  } catch (error) {
    logApp.error('Unable to emit the news feed redirect telemetry', { error });
  }
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

export const newsFeedRedirectEndpoint = (app: Express) => {
  app.get(
    `/${NEWS_FEED_REDIRECT_PATH_PREFIX}/:itemId`,
    newsFeedRedirectRateLimiter,
    NewsFeedRedirectEndpoint.redirect
  );
};
