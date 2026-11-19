import type { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { buildIpRateLimiterOptions } from '../../server/endpoints/shared/ip-rate-limit.util';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { ApiTokenHelper } from './api-token.helper';

const API_TOKEN_FAILURE_RATE_WINDOW_MS = 15 * 60 * 1000;
export const API_TOKEN_FAILURE_RATE_MAX = 30;

// The key of buildIpRateLimiterOptions, named here to read a client's count before the token is looked up
const failureKey = (req: Request): string =>
  ipKeyGenerator(req.ip ?? 'unknown');

const failureRateLimiterOptions = buildIpRateLimiterOptions({
  windowMs: API_TOKEN_FAILURE_RATE_WINDOW_MS,
  limit: API_TOKEN_FAILURE_RATE_MAX,
  logLabel: 'Refused API token',
  sendRateLimitError: (res) =>
    ApiTokenHelper.sendError(res, 429, BadRequestErrorCode.TooManyRequests),
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

// Tokens accepted in the last hour, at most 10,000 of them: a token in use keeps its place, an idle one ages out
const RECENT_API_TOKEN_TTL_MS = 60 * 60 * 1000;
export const RECENT_API_TOKEN_MAX = 10_000;

export interface RecentApiTokens {
  remember: (tokenHash: string, now?: number) => void;
  forget: (tokenHash: string) => void;
  has: (tokenHash: string, now?: number) => boolean;
  size: () => number;
}

/**
 * Hashes of the tokens accepted recently, in this process only, oldest first. Never the secret itself. Being in it
 * only skips the failure limit check: the token is still looked up and checked on every call.
 */
export const createRecentApiTokens = ({
  ttlMs,
  max,
}: {
  ttlMs: number;
  max: number;
}): RecentApiTokens => {
  // Hash to expiry time, in insertion order: the first key is always the oldest
  const expiries = new Map<string, number>();
  return {
    remember: (tokenHash, now = Date.now()) => {
      expiries.delete(tokenHash);
      expiries.set(tokenHash, now + ttlMs);
      for (const [oldestHash, expiresAt] of expiries) {
        if (expiries.size <= max && expiresAt > now) {
          break;
        }
        expiries.delete(oldestHash);
      }
    },
    forget: (tokenHash) => {
      expiries.delete(tokenHash);
    },
    has: (tokenHash, now = Date.now()) => {
      const expiresAt = expiries.get(tokenHash);
      if (expiresAt === undefined) {
        return false;
      }
      if (expiresAt <= now) {
        expiries.delete(tokenHash);
        return false;
      }
      return true;
    },
    size: () => expiries.size,
  };
};

/**
 * Tokens accepted recently get through the failure limit of their client IP: the refused tokens of other clients
 * behind the same address (NAT, VPN, CI runners) must not lock a working integration out.
 */
export const recentApiTokens = createRecentApiTokens({
  ttlMs: RECENT_API_TOKEN_TTL_MS,
  max: RECENT_API_TOKEN_MAX,
});
