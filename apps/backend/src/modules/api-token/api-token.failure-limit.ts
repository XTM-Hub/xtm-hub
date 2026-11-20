import type { Request, Response } from 'express';
import { ipRateLimitKey } from '../../server/endpoints/shared/ip-rate-limit.util';
import { logApp } from '../../utils/app-logger.util';
import { API_TOKEN_ERRORS, sendApiTokenError } from './api-token.errors';

const SECOND_MS = 1000;
const API_TOKEN_FAILURE_RATE_WINDOW_MS = 15 * 60 * SECOND_MS;
export const API_TOKEN_FAILURE_RATE_MAX = 30;

// A hit taken for a lookup, bound to the window that took it
export interface LookupReservation {
  key: string;
  resetAt: number;
}

export type ReserveResult =
  | { admitted: true; reservation: LookupReservation }
  // `firstRejection`: the first request of the window refused for its key
  | { admitted: false; resetAt: number; firstRejection: boolean };

export interface FailureCounter {
  // Takes a hit when the key is under the limit; a request over the limit takes none
  reserve: (key: string, now?: number) => ReserveResult;
  // Gives back the hit of a reservation, only to the window that took it
  release: (reservation: LookupReservation) => void;
  // Counts a hit outside a reservation, past the limit if need be
  count: (key: string, now?: number) => void;
  size: () => number;
}

interface FailureWindow {
  hits: number;
  resetAt: number;
  rejected: boolean;
}

/**
 * Hits per key in fixed windows. Synchronous on purpose: express-rate-limit's MemoryStore returns its mutable record
 * after an await, so the requests of a burst all read the hits of the whole burst, and every one of them, valid
 * tokens included, would be answered 429.
 */
export const createFailureCounter = ({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}): FailureCounter => {
  // Key to window, in the order the windows started: the first key always ends first
  const windows = new Map<string, FailureWindow>();

  const currentWindow = (key: string, now: number): FailureWindow => {
    for (const [oldestKey, { resetAt }] of windows) {
      if (resetAt > now) {
        break;
      }
      windows.delete(oldestKey);
    }
    let window = windows.get(key);
    if (!window) {
      window = { hits: 0, resetAt: now + windowMs, rejected: false };
      windows.set(key, window);
    }
    return window;
  };

  return {
    reserve: (key, now = Date.now()) => {
      const window = currentWindow(key, now);
      if (window.hits >= max) {
        const firstRejection = !window.rejected;
        window.rejected = true;
        return { admitted: false, resetAt: window.resetAt, firstRejection };
      }
      window.hits++;
      return {
        admitted: true,
        reservation: { key, resetAt: window.resetAt },
      };
    },
    release: ({ key, resetAt }) => {
      // A window that started after the reservation never counted its hit
      const window = windows.get(key);
      if (window?.resetAt === resetAt && window.hits > 0) {
        window.hits--;
      }
    },
    count: (key, now = Date.now()) => {
      currentWindow(key, now).hits++;
    },
    size: () => windows.size,
  };
};

/**
 * Refused tokens per client IP (`req.ip`, which follows the `trust proxy` setting). A token takes its hit before its
 * lookup, so that a burst of unknown tokens sent at once sees its own hits, and an accepted token or a failed lookup
 * gives it back: only refused tokens use up the allowance, a request answered 429 takes none, and the failures of one
 * client never block another. In memory and per replica, like the other limiters.
 */
const failures = createFailureCounter({
  windowMs: API_TOKEN_FAILURE_RATE_WINDOW_MS,
  max: API_TOKEN_FAILURE_RATE_MAX,
});

/**
 * Takes a hit for a token about to be looked up and returns its reservation. Over the limit, answers 429 and returns
 * undefined: the token must not be looked up.
 */
export const admitApiTokenLookup = (
  req: Request,
  res: Response
): LookupReservation | undefined => {
  const now = Date.now();
  const result = failures.reserve(ipRateLimitKey(req), now);
  if (result.admitted) {
    return result.reservation;
  }
  // Once per client and window: a sustained flood does not flood the logs
  if (result.firstRejection) {
    logApp.warn('[RATE-LIMIT] Refused API token request rate limited', {
      ip: req.ip,
      path: req.path,
      limit: API_TOKEN_FAILURE_RATE_MAX,
      windowMs: API_TOKEN_FAILURE_RATE_WINDOW_MS,
    });
  }
  res.setHeader(
    'Retry-After',
    Math.ceil((result.resetAt - now) / SECOND_MS).toString()
  );
  sendApiTokenError(res, API_TOKEN_ERRORS.TooManyRequests);
  return undefined;
};

// An accepted token, or a lookup that failed, gives back the hit it took in admitApiTokenLookup
export const releaseApiTokenLookup = (reservation: LookupReservation): void => {
  failures.release(reservation);
};

// A refused token that was looked up without a reservation, because it had been accepted recently
export const countRefusedApiToken = (req: Request): void => {
  failures.count(ipRateLimitKey(req));
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
