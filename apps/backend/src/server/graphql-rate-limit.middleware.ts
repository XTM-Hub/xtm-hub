import type { Request, RequestHandler, Response } from 'express';
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import { ErrorCode } from '../utils/error/error.code';
import { isPrivateIp } from '../utils/rate-limit.util';
import { buildIpRateLimiterOptions } from './endpoints/shared/ip-rate-limit.util';

const GRAPHQL_RATE_WINDOW_MS = 60 * 1000;
// A page of the Hub sends a few dozen operations at most: these leave room for fast navigation
export const GRAPHQL_USER_RATE_LIMIT = 600;
export const GRAPHQL_ANONYMOUS_IP_RATE_LIMIT = 300;

const sendTooManyRequests = (res: Response) => {
  res.status(429).json({
    errors: [
      {
        message: ErrorCode.TooManyRequests,
        extensions: { code: ErrorCode.TooManyRequests },
      },
    ],
  });
};

const isPreflight = (req: Request) => req.method === 'OPTIONS';

/**
 * Keyed by the signed-in user, from the session: the browser and the server rendering of the frontend share it, and
 * the users of a company behind one address keep their own budget.
 */
export const buildGraphqlUserRateLimiterOptions = (): Partial<Options> => ({
  ...buildIpRateLimiterOptions({
    windowMs: GRAPHQL_RATE_WINDOW_MS,
    limit: GRAPHQL_USER_RATE_LIMIT,
    logLabel: 'GraphQL user',
    sendRateLimitError: sendTooManyRequests,
  }),
  skip: (req: Request) => isPreflight(req) || !req.session?.user,
  // The skip leaves only signed-in requests: the address is a fallback for the type checker
  keyGenerator: (req: Request) =>
    req.session.user
      ? `user:${req.session.user.id}`
      : `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`,
});

/**
 * Keyed by the IP of an anonymous caller: public pages and platforms. Private addresses are skipped, because the
 * server rendering of public pages reaches the API from inside the network with one address for every visitor.
 * Platform headers are not used as a key: they are not checked yet when the limiter runs, so a caller could change
 * them on every request.
 */
export const buildGraphqlAnonymousRateLimiterOptions =
  (): Partial<Options> => ({
    ...buildIpRateLimiterOptions({
      windowMs: GRAPHQL_RATE_WINDOW_MS,
      limit: GRAPHQL_ANONYMOUS_IP_RATE_LIMIT,
      logLabel: 'GraphQL anonymous',
      sendRateLimitError: sendTooManyRequests,
    }),
    skip: (req: Request) =>
      isPreflight(req) || Boolean(req.session?.user) || isPrivateIp(req.ip),
  });

/** Built once, so that every GraphQL path shares the same budgets. */
export const createGraphqlRateLimiters = (): RequestHandler[] => [
  rateLimit(buildGraphqlUserRateLimiterOptions()),
  rateLimit(buildGraphqlAnonymousRateLimiterOptions()),
];
