import type { Request, Response } from 'express';
import type { Options } from 'express-rate-limit';
import { AppLogsCategory, logApp } from '../../../utils/app-logger.util';
import { buildIpRateLimiterOptions } from '../shared/ip-rate-limit.util';
import {
  sendVerificationEmailError,
  VERIFICATION_EMAIL_ERRORS,
} from './verification-email-endpoint.errors';

const IP_RATE_WINDOW_MS = 15 * 60 * 1000;
const IP_RATE_MAX = 10;
// The store is in memory, so each API replica allows its own email per window.
const SUBJECT_RATE_WINDOW_MS = 5 * 60 * 1000;
const SUBJECT_RATE_MAX = 1;

const sendTooManyRequests = (res: Response) =>
  sendVerificationEmailError(res, VERIFICATION_EMAIL_ERRORS.TooManyRequests);

export const buildVerificationEmailIpRateLimiterOptions =
  (): Partial<Options> =>
    buildIpRateLimiterOptions({
      windowMs: IP_RATE_WINDOW_MS,
      limit: IP_RATE_MAX,
      logLabel: 'Verification email',
      sendRateLimitError: sendTooManyRequests,
    });

/**
 * Keyed by the refused Auth0 account, not the IP: whoever registered an
 * address they don't own must not be able to flood its mailbox by retrying
 * from new sessions or IPs.
 */
export const buildVerificationEmailSubjectRateLimiterOptions =
  (): Partial<Options> => ({
    windowMs: SUBJECT_RATE_WINDOW_MS,
    limit: SUBJECT_RATE_MAX,
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
      sendTooManyRequests(res);
    },
  });
