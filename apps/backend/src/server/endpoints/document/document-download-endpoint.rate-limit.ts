import type { Request, Response } from 'express';
import { ipKeyGenerator, type Options } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { PLATFORM_ID_HEADER } from '../../../modules/security-management/token/platform-token.util';
import { isPrivateIp } from '../../../utils/rate-limit.util';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';

export const USER_PLATFORM_TOKEN_HEADER = 'XTM-Hub-User-Platform-Token';

const DOWNLOAD_RATE_WINDOW_MS = 3 * 60 * 1000;
const DOWNLOAD_USER_RATE_LIMIT = 10;
// A platform downloads from its server for all its users, from one address
const DOWNLOAD_IP_RATE_LIMIT = 100;

const sendTooManyRequests = (res: Response) => {
  res.status(429).json({ message: 'Too many requests' });
};

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/**
 * Keyed by the user who downloads: from their Hub session, or from the user token a platform sends with its own id.
 * The token is hashed so that the limiter does not keep it in memory. Without either, the caller's IP is the key.
 */
export const buildDocumentDownloadUserRateLimiterOptions =
  (): Partial<Options> => ({
    ...buildIpRateLimiterOptions({
      windowMs: DOWNLOAD_RATE_WINDOW_MS,
      limit: DOWNLOAD_USER_RATE_LIMIT,
      logLabel: 'Document download user',
      sendRateLimitError: sendTooManyRequests,
    }),
    keyGenerator: (req: Request) => {
      const sessionUser = req.session?.user;
      if (sessionUser) {
        return `user:${sessionUser.id}`;
      }
      const userPlatformToken = req.header(USER_PLATFORM_TOKEN_HEADER);
      if (userPlatformToken) {
        const platformId = req.header(PLATFORM_ID_HEADER) ?? '';
        return `platform:${platformId}|user:${hashToken(userPlatformToken)}`;
      }
      return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
    },
  });

/**
 * Bounds what one address can send, whatever user token it puts in its requests: the user key comes from headers
 * that are not checked yet when the limiter runs.
 */
export const buildDocumentDownloadIpRateLimiterOptions =
  (): Partial<Options> => ({
    ...buildIpRateLimiterOptions({
      windowMs: DOWNLOAD_RATE_WINDOW_MS,
      limit: DOWNLOAD_IP_RATE_LIMIT,
      logLabel: 'Document download',
      sendRateLimitError: sendTooManyRequests,
    }),
    skip: (req: Request) => isPrivateIp(req.ip),
  });
