import type { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { buildIpRateLimiterOptions } from '../../server/endpoints/shared/ip-rate-limit.util';

const API_TOKEN_FAILURE_RATE_WINDOW_MS = 15 * 60 * 1000;
export const API_TOKEN_FAILURE_RATE_MAX = 30;

// The key of buildIpRateLimiterOptions, named here to read a client's count before the token is looked up
const failureKey = (req: Request): string =>
  ipKeyGenerator(req.ip ?? 'unknown');

const failureRateLimiterOptions = buildIpRateLimiterOptions({
  windowMs: API_TOKEN_FAILURE_RATE_WINDOW_MS,
  limit: API_TOKEN_FAILURE_RATE_MAX,
  logLabel: 'Refused API token',
  sendRateLimitError: (res) => {
    res.status(429).json({
      errors: [
        {
          message: 'TOO_MANY_REQUESTS',
          extensions: { code: 'TOO_MANY_REQUESTS' },
        },
      ],
    });
  },
});

/**
 * Refused tokens per client IP (`req.ip`, which follows the `trust proxy` setting). Only refusals are counted: a
 * client whose tokens are accepted never reaches it, and the failures of one client never block another.
 */
const apiTokenFailureRateLimiter = rateLimit({
  ...failureRateLimiterOptions,
  keyGenerator: failureKey,
});

/**
 * Whether the client has used up its refused tokens for the window. Checked before the token is looked up, so that a
 * burst of random tokens costs no database query once over the limit.
 */
export const isApiTokenFailureLimitReached = async (
  req: Request
): Promise<boolean> => {
  const hits = await apiTokenFailureRateLimiter.getKey(failureKey(req));
  // The memory store keeps an expired client until its next cleanup
  return (
    !!hits &&
    hits.totalHits >= API_TOKEN_FAILURE_RATE_MAX &&
    (hits.resetTime?.getTime() ?? 0) > Date.now()
  );
};

/**
 * Counts a refused token for its client, then calls `sendRefusal`, or answers 429 when this refusal is over the limit.
 */
export const countApiTokenFailure = async (
  req: Request,
  res: Response,
  sendRefusal: () => void,
  next: NextFunction
): Promise<void> => {
  await apiTokenFailureRateLimiter(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    sendRefusal();
  });
};
