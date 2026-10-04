import { ipKeyGenerator } from 'express-rate-limit';
import { BadRequestErrorCode } from '../../../../../utils/error/error.code';
import { BadRequestError } from '../../../../../utils/error/error.util';

/**
 * Coverage searches selecting facets that one caller may run per window: each
 * one runs up to seven aggregations over the whole public catalog.
 */
export const COVERAGE_FACETS_RATE_LIMIT = {
  windowMs: 60 * 1000,
  limit: 30,
};

// Bounds the memory of the limiter under a flood of distinct callers
const MAX_TRACKED_CALLERS = 10_000;

interface FixedWindowLimiterOptions {
  windowMs: number;
  limit: number;
  maxKeys: number;
}

export const createFixedWindowLimiter = ({
  windowMs,
  limit,
  maxKeys,
}: FixedWindowLimiterOptions) => {
  const windows = new Map<string, { startedAt: number; count: number }>();

  const evict = (now: number) => {
    for (const [key, window] of windows) {
      if (now - window.startedAt >= windowMs) {
        windows.delete(key);
      }
    }
    if (windows.size >= maxKeys) {
      const oldestKey = windows.keys().next().value;
      if (oldestKey !== undefined) {
        windows.delete(oldestKey);
      }
    }
  };

  return {
    /** Counts one request of the key; false once the key used up the limit of its window. */
    consume: (key: string, now = Date.now()): boolean => {
      const window = windows.get(key);
      if (window && now - window.startedAt < windowMs) {
        if (window.count >= limit) {
          return false;
        }
        window.count += 1;
        return true;
      }
      windows.delete(key);
      if (windows.size >= maxKeys) {
        evict(now);
      }
      windows.set(key, { startedAt: now, count: 1 });
      return true;
    },
    clear: () => windows.clear(),
  };
};

/**
 * A signed-in caller is limited per user; an anonymous caller per IP, with the
 * IPv6 grouping and the `req.ip` of the hub's other IP rate limiters.
 */
export const coverageFacetsCallerKey = ({
  userId,
  ip,
}: {
  userId?: string;
  ip?: string;
}): string =>
  userId ? `user:${userId}` : `ip:${ipKeyGenerator(ip ?? 'unknown')}`;

const coverageFacetsLimiter = createFixedWindowLimiter({
  ...COVERAGE_FACETS_RATE_LIMIT,
  maxKeys: MAX_TRACKED_CALLERS,
});

export const IntegrationCoverageRateLimit = {
  assertFacetsAllowed: (caller: { userId?: string; ip?: string }): void => {
    if (!coverageFacetsLimiter.consume(coverageFacetsCallerKey(caller))) {
      throw BadRequestError(BadRequestErrorCode.CoverageSearchRateLimited, {
        detail: 'Too many coverage searches with facets, retry in a minute',
      });
    }
  },
  reset: () => coverageFacetsLimiter.clear(),
};
