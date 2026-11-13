import type { Request } from 'express';
import type { Options } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { PLATFORM_ID_HEADER } from '../../../modules/security-management/token/platform-token.util';
import {
  buildRateLimiterOptions,
  sessionUserKey,
} from '../../../utils/rate-limit.util';

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
