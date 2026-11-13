import type { Request, Response } from 'express';
import { ipKeyGenerator, MemoryStore, type Options } from 'express-rate-limit';
import { BlockList, isIP } from 'node:net';
import { logApp } from './app-logger.util';
import { ErrorCode } from './error/error.code';

// region Client addresses

const privateAddresses = new BlockList();
privateAddresses.addSubnet('10.0.0.0', 8, 'ipv4');
privateAddresses.addSubnet('100.64.0.0', 10, 'ipv4');
privateAddresses.addSubnet('127.0.0.0', 8, 'ipv4');
privateAddresses.addSubnet('169.254.0.0', 16, 'ipv4');
privateAddresses.addSubnet('172.16.0.0', 12, 'ipv4');
privateAddresses.addSubnet('192.168.0.0', 16, 'ipv4');
privateAddresses.addAddress('::1', 'ipv6');
privateAddresses.addSubnet('fc00::', 7, 'ipv6');
privateAddresses.addSubnet('fe80::', 10, 'ipv6');

const IPV4_MAPPED_PREFIX = '::ffff:';

/**
 * Tells whether a request comes from inside the network rather than from a client: the frontend server rendering a
 * page, or a proxy when `trust proxy` does not match the deployment. A missing address counts as private.
 */
export const isPrivateIp = (ip: string | undefined): boolean => {
  if (!ip) {
    return true;
  }
  const address = ip.toLowerCase().startsWith(IPV4_MAPPED_PREFIX)
    ? ip.slice(IPV4_MAPPED_PREFIX.length)
    : ip;
  const family = isIP(address);
  if (family === 0) {
    return false;
  }
  return privateAddresses.check(address, family === 4 ? 'ipv4' : 'ipv6');
};

/** The client IP, IPv6 grouped by subnet so that one client can't get a bucket per address. */
export const clientIpKey = (req: Request) =>
  ipKeyGenerator(req.ip ?? 'unknown');

/** The signed-in user, or the client IP for an anonymous request. */
export const sessionUserKey = (req: Request) =>
  req.session?.user ? `user:${req.session.user.id}` : `ip:${clientIpKey(req)}`;

// endregion

// region Express routes

const RATE_LIMIT_LOG_INTERVAL_MS = 60 * 1000;
const MAX_LOG_RATE_ENTRIES = 100;

const sendDefaultTooManyRequests = (res: Response) => {
  res
    .status(429)
    .json({ message: 'Too many requests, please try again later' });
};

export interface RateLimiterConfig {
  windowMs: number;
  limit: number;
  /** Short label used in the throttled log message, e.g. 'Manifest', 'Product version'. */
  logLabel: string;
  /** Sends the rate-limited response body/status. Defaults to a JSON `{ message }` with status 429. */
  sendRateLimitError?: (res: Response) => void;
  /** Defaults to the client IP. */
  keyGenerator?: (req: Request) => string;
  /** Requests that are not counted. */
  skip?: (req: Request) => boolean;
  /**
   * Leaves private addresses out, for a limiter keyed by IP: they don't tell clients apart, so counting them would
   * put every visitor in one bucket.
   */
  skipPrivateIp?: boolean;
}

/**
 * Builds express-rate-limit options, keyed by the client IP unless told otherwise (ignoring the User-Agent, so an
 * attacker can't get one bucket per UA), with a throttled warning log so a sustained flood doesn't spam the logs.
 */
export const buildRateLimiterOptions = ({
  windowMs,
  limit,
  logLabel,
  sendRateLimitError = sendDefaultTooManyRequests,
  keyGenerator = clientIpKey,
  skip,
  skipPrivateIp = false,
}: RateLimiterConfig): Partial<Options> => {
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

    logApp.warn(`[RATE-LIMIT] ${logLabel} request rate limited`, {
      ip,
      path,
      limit,
      windowMs,
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
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip: (req: Request) =>
      (skipPrivateIp && isPrivateIp(req.ip)) || (skip?.(req) ?? false),
    handler: (req: Request, res: Response) => {
      logRateLimitThrottled(req.ip ?? 'unknown', req.path);
      sendRateLimitError(res);
    },
  };
};

// endregion

// region Code outside a route

export interface KeyRateLimiter {
  /** Counts one hit for the key and tells whether it is still within the limit. */
  tryConsume: (key: string) => Promise<boolean>;
  /** Counts one hit for the key and throws `TOO_MANY_REQUESTS` once it is over the limit. */
  consumeOrThrow: (key: string) => Promise<void>;
  /**
   * Counts one hit for the key from a client address. A private address doesn't tell clients apart, so its hits are
   * always allowed rather than merged into one bucket.
   */
  tryConsumeForIp: (ip: string | undefined, key: string) => Promise<boolean>;
  reset: () => Promise<void>;
}

/**
 * A fixed-window limiter for code that is not an Express route, such as a GraphQL resolver. The store is in memory,
 * so each API replica allows its own hits per window.
 */
export const createKeyRateLimiter = ({
  windowMs,
  limit,
}: {
  windowMs: number;
  limit: number;
}): KeyRateLimiter => {
  const store = new MemoryStore();
  store.init({ windowMs } as Options);
  const tryConsume = async (key: string) =>
    (await store.increment(key)).totalHits <= limit;
  return {
    tryConsume,
    consumeOrThrow: async (key) => {
      if (!(await tryConsume(key))) {
        throw new Error(ErrorCode.TooManyRequests);
      }
    },
    tryConsumeForIp: async (ip, key) =>
      isPrivateIp(ip) ||
      tryConsume(`${ipKeyGenerator(ip ?? 'unknown')}|${key}`),
    reset: () => store.resetAll(),
  };
};

// endregion
