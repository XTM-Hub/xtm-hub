import type { Request, RequestHandler, Response } from 'express';
import rateLimit, {
  ipKeyGenerator,
  MemoryStore,
  type Options,
} from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { BlockList, isIP } from 'node:net';
import { PLATFORM_ID_HEADER } from '../modules/security-management/token/platform-token.util';
import {
  MANIFEST_ERRORS,
  sendManifestError,
} from '../server/endpoints/manifest/manifest-endpoint.errors';
import {
  sendVerificationEmailError,
  VERIFICATION_EMAIL_ERRORS,
} from '../server/endpoints/verification-email/verification-email-endpoint.errors';
import {
  sendVersionsMatrixError,
  VERSIONS_MATRIX_ERRORS,
} from '../server/endpoints/versions-matrix/versions-matrix-endpoint.errors';
import { AppLogsCategory, logApp } from './app-logger.util';
import { ErrorCode } from './error/error.code';

/**
 * Every rate limiter of the API, with the helpers they are built from. Each in-memory store counts on its own API
 * replica, so the effective limit is multiplied by the number of replicas.
 */

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

// region GraphQL

const GRAPHQL_RATE_WINDOW_MS = 60 * 1000;
// A page of the Hub sends a few dozen operations at most: these leave room for fast navigation
export const GRAPHQL_USER_RATE_LIMIT = 600;
export const GRAPHQL_ANONYMOUS_IP_RATE_LIMIT = 300;

const sendGraphqlTooManyRequests = (res: Response) => {
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
export const buildGraphqlUserRateLimiterOptions = (): Partial<Options> =>
  buildRateLimiterOptions({
    windowMs: GRAPHQL_RATE_WINDOW_MS,
    limit: GRAPHQL_USER_RATE_LIMIT,
    logLabel: 'GraphQL user',
    sendRateLimitError: sendGraphqlTooManyRequests,
    keyGenerator: sessionUserKey,
    skip: (req) => isPreflight(req) || !req.session?.user,
  });

/**
 * Keyed by the IP of an anonymous caller: public pages and platforms. Private addresses are skipped, because the
 * server rendering of public pages reaches the API from inside the network with one address for every visitor.
 * Platform headers are not used as a key: they are not checked yet when the limiter runs, so a caller could change
 * them on every request.
 */
export const buildGraphqlAnonymousRateLimiterOptions = (): Partial<Options> =>
  buildRateLimiterOptions({
    windowMs: GRAPHQL_RATE_WINDOW_MS,
    limit: GRAPHQL_ANONYMOUS_IP_RATE_LIMIT,
    logLabel: 'GraphQL anonymous',
    sendRateLimitError: sendGraphqlTooManyRequests,
    skipPrivateIp: true,
    skip: (req) => isPreflight(req) || Boolean(req.session?.user),
  });

/** Built once, so that every GraphQL path shares the same budgets. */
export const createGraphqlRateLimiters = (): RequestHandler[] => [
  rateLimit(buildGraphqlUserRateLimiterOptions()),
  rateLimit(buildGraphqlAnonymousRateLimiterOptions()),
];

// The share counter is public and the mutation needs no session: one share per address and document per hour.
export const shareCountRateLimiter = createKeyRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 1,
});

// Each message reaches HubSpot and the sales team: a sender gets a few per hour, counted once the sender is known so
// that a refused request costs nothing.
export const contactSalesRateLimiter = createKeyRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

// endregion

// region Document download

export const USER_PLATFORM_TOKEN_HEADER = 'XTM-Hub-User-Platform-Token';

const DOWNLOAD_RATE_WINDOW_MS = 3 * 60 * 1000;
const DOWNLOAD_USER_RATE_LIMIT = 10;
// A platform downloads from its server for all its users, from one address
const DOWNLOAD_IP_RATE_LIMIT = 100;

/**
 * The user who downloads: from their Hub session, or from the user token a platform sends with its own id. The token
 * is hashed so that the limiter does not keep it in memory. Without either, the caller's IP.
 */
const downloadUserKey = (req: Request) => {
  const userPlatformToken = req.header(USER_PLATFORM_TOKEN_HEADER);
  if (req.session?.user || !userPlatformToken) {
    return sessionUserKey(req);
  }
  const tokenHash = createHash('sha256')
    .update(userPlatformToken)
    .digest('hex');
  return `platform:${req.header(PLATFORM_ID_HEADER) ?? ''}|user:${tokenHash}`;
};

export const buildDocumentDownloadUserRateLimiterOptions =
  (): Partial<Options> =>
    buildRateLimiterOptions({
      windowMs: DOWNLOAD_RATE_WINDOW_MS,
      limit: DOWNLOAD_USER_RATE_LIMIT,
      logLabel: 'Document download user',
      keyGenerator: downloadUserKey,
    });

/**
 * Bounds what one address can send, whatever user token it puts in its requests: the user key comes from headers
 * that are not checked yet when the limiter runs.
 */
export const buildDocumentDownloadIpRateLimiterOptions = (): Partial<Options> =>
  buildRateLimiterOptions({
    windowMs: DOWNLOAD_RATE_WINDOW_MS,
    limit: DOWNLOAD_IP_RATE_LIMIT,
    logLabel: 'Document download',
    skipPrivateIp: true,
  });

export const documentDownloadIpRateLimiter = rateLimit(
  buildDocumentDownloadIpRateLimiterOptions()
);
export const documentDownloadUserRateLimiter = rateLimit(
  buildDocumentDownloadUserRateLimiterOptions()
);

// endregion

// region Verification email

const VERIFICATION_EMAIL_IP_RATE_WINDOW_MS = 15 * 60 * 1000;
const VERIFICATION_EMAIL_IP_RATE_MAX = 10;
// The store is in memory, so each API replica allows its own email per window.
const VERIFICATION_EMAIL_SUBJECT_RATE_WINDOW_MS = 5 * 60 * 1000;
const VERIFICATION_EMAIL_SUBJECT_RATE_MAX = 1;

const sendVerificationEmailTooManyRequests = (res: Response) =>
  sendVerificationEmailError(res, VERIFICATION_EMAIL_ERRORS.TooManyRequests);

export const buildVerificationEmailIpRateLimiterOptions =
  (): Partial<Options> =>
    buildRateLimiterOptions({
      windowMs: VERIFICATION_EMAIL_IP_RATE_WINDOW_MS,
      limit: VERIFICATION_EMAIL_IP_RATE_MAX,
      logLabel: 'Verification email',
      sendRateLimitError: sendVerificationEmailTooManyRequests,
    });

/**
 * Keyed by the refused Auth0 account, not the IP: whoever registered an
 * address they don't own must not be able to flood its mailbox by retrying
 * from new sessions or IPs.
 */
export const buildVerificationEmailSubjectRateLimiterOptions =
  (): Partial<Options> => ({
    windowMs: VERIFICATION_EMAIL_SUBJECT_RATE_WINDOW_MS,
    limit: VERIFICATION_EMAIL_SUBJECT_RATE_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    // A failed send must not cost the user their only attempt of the window.
    skipFailedRequests: true,
    skip: (req: Request) => !req.session.unverifiedIdpSubject,
    keyGenerator: (req: Request) => req.session.unverifiedIdpSubject ?? '',
    handler: (req: Request, res: Response) => {
      logApp.warn(
        '[RATE-LIMIT] Verification email request rate limited',
        { idpSubject: req.session.unverifiedIdpSubject },
        AppLogsCategory.LOGIN_PROVIDER
      );
      sendVerificationEmailTooManyRequests(res);
    },
  });

/** Built when the endpoint is registered: the IP limiter runs first, then the one per refused account. */
export const createVerificationEmailRateLimiters = (): RequestHandler[] => [
  rateLimit(buildVerificationEmailIpRateLimiterOptions()),
  rateLimit(buildVerificationEmailSubjectRateLimiterOptions()),
];

// endregion

// region Public endpoints

const MANIFEST_RATE_WINDOW_MS = 60 * 1000;
const MANIFEST_RATE_MAX = 300;

export const buildManifestRateLimiterOptions = (): Partial<Options> =>
  buildRateLimiterOptions({
    windowMs: MANIFEST_RATE_WINDOW_MS,
    limit: MANIFEST_RATE_MAX,
    logLabel: 'Manifest',
    sendRateLimitError: (res) =>
      sendManifestError(res, MANIFEST_ERRORS.TooManyRequests),
  });

export const manifestRateLimiter = rateLimit(buildManifestRateLimiterOptions());

const VERSIONS_MATRIX_RATE_WINDOW_MS = 60 * 1000;
const VERSIONS_MATRIX_RATE_MAX = 300;

export const versionsMatrixRateLimiter = rateLimit(
  buildRateLimiterOptions({
    windowMs: VERSIONS_MATRIX_RATE_WINDOW_MS,
    limit: VERSIONS_MATRIX_RATE_MAX,
    logLabel: 'Versions matrix',
    sendRateLimitError: (res) =>
      sendVersionsMatrixError(res, VERSIONS_MATRIX_ERRORS.TooManyRequests),
  })
);

const PRODUCT_VERSION_RATE_WINDOW_MS = 60 * 1000;
const PRODUCT_VERSION_RATE_MAX = 300;

export const buildProductVersionRateLimiterOptions = (): Partial<Options> =>
  buildRateLimiterOptions({
    windowMs: PRODUCT_VERSION_RATE_WINDOW_MS,
    limit: PRODUCT_VERSION_RATE_MAX,
    logLabel: 'Product version',
    sendRateLimitError: (res) =>
      res.status(429).json({
        code: 429,
        message: 'Too many requests, please try again later',
      }),
  });

export const productVersionRateLimiter = rateLimit(
  buildProductVersionRateLimiterOptions()
);

// Clicks from a news feed are rare, so the limit is far below the other public endpoints
const NEWS_FEED_REDIRECT_RATE_WINDOW_MS = 60 * 1000;
const NEWS_FEED_REDIRECT_RATE_MAX = 60;

export const newsFeedRedirectRateLimiter = rateLimit(
  buildRateLimiterOptions({
    windowMs: NEWS_FEED_REDIRECT_RATE_WINDOW_MS,
    limit: NEWS_FEED_REDIRECT_RATE_MAX,
    logLabel: 'News feed redirect',
    sendRateLimitError: (res) => {
      res.status(429).json({
        code: 429,
        message: 'Too many requests, please try again later',
      });
    },
  })
);

// Called by n8n on every blog post change, a few times a minute at most
const NEWS_FEED_BLOGPOST_SYNC_RATE_WINDOW_MS = 60 * 1000;
const NEWS_FEED_BLOGPOST_SYNC_RATE_MAX = 30;

export const newsFeedBlogpostSyncRateLimiter = rateLimit(
  buildRateLimiterOptions({
    windowMs: NEWS_FEED_BLOGPOST_SYNC_RATE_WINDOW_MS,
    limit: NEWS_FEED_BLOGPOST_SYNC_RATE_MAX,
    logLabel: 'News feed blogpost sync',
    sendRateLimitError: (res) => {
      res.status(429).json({
        message: 'Too many requests, please try again later',
      });
    },
  })
);

// The limiters below keep the express-rate-limit default key and response.

export const csvExportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 exports per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const USER_PICTURE_RATE_WINDOW_MS = 60 * 1000;
const USER_PICTURE_RATE_MAX = 300;

export const userPictureRateLimiter = rateLimit({
  windowMs: USER_PICTURE_RATE_WINDOW_MS,
  max: USER_PICTURE_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authProviderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// endregion
