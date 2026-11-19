import type { Request, Response } from 'express';
import { logApp } from '../../utils/app-logger.util';
import { ipRateLimitKey } from '../../utils/ip-rate-limit.util';
import { API_TOKEN_ERRORS, sendApiTokenError } from './api-token.errors';

const SECOND_MS = 1000;
const API_TOKEN_FAILURE_RATE_WINDOW_MS = 15 * 60 * SECOND_MS;
export const API_TOKEN_FAILURE_RATE_MAX = 30;

export interface FailureCounter {
  // Counts a hit for the key and returns the hits of its window, this one included
  hit: (key: string, now?: number) => { hits: number; resetAt: number };
  // Gives back a hit of the current window
  refund: (key: string, now?: number) => void;
  size: () => number;
}

/**
 * Hits per key in fixed windows. Synchronous on purpose: express-rate-limit's MemoryStore returns its mutable record
 * after an await, so the requests of a burst all read the hits of the whole burst, and every one of them, valid
 * tokens included, would be answered 429.
 */
export const createFailureCounter = ({
  windowMs,
}: {
  windowMs: number;
}): FailureCounter => {
  // Key to window, in the order the windows started: the first key always ends first
  const windows = new Map<string, { hits: number; resetAt: number }>();
  return {
    hit: (key, now = Date.now()) => {
      for (const [oldestKey, { resetAt }] of windows) {
        if (resetAt > now) {
          break;
        }
        windows.delete(oldestKey);
      }
      let window = windows.get(key);
      if (!window) {
        window = { hits: 0, resetAt: now + windowMs };
        windows.set(key, window);
      }
      window.hits++;
      return { hits: window.hits, resetAt: window.resetAt };
    },
    refund: (key, now = Date.now()) => {
      const window = windows.get(key);
      if (window && window.resetAt > now && window.hits > 0) {
        window.hits--;
      }
    },
    size: () => windows.size,
  };
};

/**
 * Refused tokens per client IP (`req.ip`, which follows the `trust proxy` setting). A token takes its hit before its
 * lookup, so that a burst of unknown tokens sent at once sees its own hits, and an accepted token gives it back: only
 * refused tokens use up the allowance, and the failures of one client never block another. In memory and per replica,
 * like the other limiters.
 */
const failures = createFailureCounter({
  windowMs: API_TOKEN_FAILURE_RATE_WINDOW_MS,
});

/**
 * Takes a hit for a token about to be looked up. Over the limit, answers 429 and returns false: the token must not be
 * looked up.
 */
export const admitApiTokenLookup = (req: Request, res: Response): boolean => {
  const now = Date.now();
  const { hits, resetAt } = failures.hit(ipRateLimitKey(req), now);
  if (hits <= API_TOKEN_FAILURE_RATE_MAX) {
    return true;
  }
  // Once per client and window: a sustained flood does not flood the logs
  if (hits === API_TOKEN_FAILURE_RATE_MAX + 1) {
    logApp.warn('[RATE-LIMIT] Refused API token request rate limited', {
      ip: req.ip,
      path: req.path,
      limit: API_TOKEN_FAILURE_RATE_MAX,
      windowMs: API_TOKEN_FAILURE_RATE_WINDOW_MS,
    });
  }
  res.setHeader(
    'Retry-After',
    Math.ceil((resetAt - now) / SECOND_MS).toString()
  );
  sendApiTokenError(res, API_TOKEN_ERRORS.TooManyRequests);
  return false;
};

// An accepted token gives back the hit it took in admitApiTokenLookup
export const refundApiTokenLookup = (req: Request): void => {
  failures.refund(ipRateLimitKey(req));
};

// A refused token that was looked up without taking a hit, because it had been accepted recently
export const countRefusedApiToken = (req: Request): void => {
  failures.hit(ipRateLimitKey(req));
};

const RECENT_API_TOKEN_TTL_MS = 60 * 60 * SECOND_MS;
export const RECENT_API_TOKEN_MAX = 10_000;

export interface RecentApiTokens {
  remember: (tokenHash: string, now?: number) => void;
  forget: (tokenHash: string) => void;
  has: (tokenHash: string, now?: number) => boolean;
  size: () => number;
}

/**
 * Hashes of the tokens accepted recently, oldest first. Never the secret itself. Being in it only skips the failure
 * limit: the token is still looked up and checked on every call. A token in use keeps its place, an idle one ages out.
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
 * behind the same address (NAT, VPN, CI runners) must not lock a working integration out. A best effort, like the
 * counters: each replica knows only the tokens it accepted itself, and a restart empties it.
 */
export const recentApiTokens = createRecentApiTokens({
  ttlMs: RECENT_API_TOKEN_TTL_MS,
  max: RECENT_API_TOKEN_MAX,
});
