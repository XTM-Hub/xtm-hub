import type { Request, Response } from 'express';
import { ipKeyGenerator, type Options } from 'express-rate-limit';
import { logApp } from '../../../utils/app-logger.util';

const RATE_LIMIT_LOG_INTERVAL_MS = 60 * 1000;
const MAX_LOG_RATE_ENTRIES = 100;

export interface IpRateLimiterConfig {
  windowMs: number;
  limit: number;
  /** Short label used in the throttled log message, e.g. 'Manifest', 'Product version'. */
  logLabel: string;
  /** Sends the rate-limited response body/status for this endpoint. */
  sendRateLimitError: (res: Response) => void;
}

/**
 * Builds express-rate-limit options keyed by IP only (ignoring User-Agent, so
 * an attacker can't get one bucket per UA), with a throttled warning log so a
 * sustained flood doesn't spam the logs.
 */
export const buildIpRateLimiterOptions = (
  config: IpRateLimiterConfig
): Partial<Options> => {
  const rateLimitLogThrottle = new Map<string, number>();

  const logRateLimitThrottled = (ip: string, path: string): void => {
    const key = `${ip}|${path}`;
    const now = Date.now();
    const lastLogged = rateLimitLogThrottle.get(key);
    if (
      lastLogged !== undefined &&
      now - lastLogged < RATE_LIMIT_LOG_INTERVAL_MS
    ) {
      return;
    }

    rateLimitLogThrottle.delete(key);
    rateLimitLogThrottle.set(key, now);

    logApp.warn(`[RATE-LIMIT] ${config.logLabel} request rate limited`, {
      ip,
      path,
      limit: config.limit,
      windowMs: config.windowMs,
    });

    if (rateLimitLogThrottle.size > MAX_LOG_RATE_ENTRIES) {
      for (const [entryKey, loggedAt] of rateLimitLogThrottle) {
        if (now - loggedAt >= RATE_LIMIT_LOG_INTERVAL_MS) {
          rateLimitLogThrottle.delete(entryKey);
        }
      }
      const oldestKey = rateLimitLogThrottle.keys().next().value;
      if (oldestKey !== undefined) {
        rateLimitLogThrottle.delete(oldestKey);
      }
    }
  };

  return {
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Keyed by IP only: the issue requires per-IP protection against bots, and
    // adding the User-Agent would let an attacker get one bucket per UA.
    keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (req: Request, res: Response) => {
      logRateLimitThrottled(req.ip ?? 'unknown', req.path);
      config.sendRateLimitError(res);
    },
  };
};
