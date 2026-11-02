import { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { auth0Client } from '../../../thirdparty/auth0/client';
import { AppLogsCategory, logApp } from '../../../utils/app-logger.util';
import {
  sendVerificationEmailError,
  VERIFICATION_EMAIL_ERRORS,
} from './verification-email-endpoint.errors';
import {
  buildVerificationEmailIpRateLimiterOptions,
  buildVerificationEmailSubjectRateLimiterOptions,
} from './verification-email-endpoint.rate-limit';

export const VERIFICATION_EMAIL_PATH = '/auth/verification-email';

/**
 * Resends Auth0's verification email to the account whose sign-in was just
 * refused. The account comes from the session only: taking an email or an id
 * from the request would let anyone send emails to any address.
 */
export const resendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const idpSubject = req.session.unverifiedIdpSubject;
  if (!idpSubject) {
    // Key names only, and a session id prefix: enough to match the `sessions`
    // row without logging a full identifier.
    logApp.warn(
      'No pending verification in session',
      {
        sessionIdPrefix: req.sessionID?.slice(0, 8),
        sessionKeys: Object.keys(req.session ?? {}),
      },
      AppLogsCategory.LOGIN_PROVIDER
    );
    sendVerificationEmailError(
      res,
      VERIFICATION_EMAIL_ERRORS.NoPendingVerification
    );
    return;
  }

  try {
    await auth0Client.sendVerificationEmail(idpSubject);
    logApp.info(
      'Verification email resent',
      { idpSubject },
      AppLogsCategory.LOGIN_PROVIDER
    );
    res.status(204).end();
  } catch (error) {
    logApp.error(
      'Unable to resend the verification email',
      { cause: error, idpSubject },
      AppLogsCategory.LOGIN_PROVIDER
    );
    sendVerificationEmailError(
      res,
      VERIFICATION_EMAIL_ERRORS.VerificationEmailFailed
    );
  }
};

export const verificationEmailEndpoint = (app: Express) => {
  app.post(
    VERIFICATION_EMAIL_PATH,
    rateLimit(buildVerificationEmailIpRateLimiterOptions()),
    rateLimit(buildVerificationEmailSubjectRateLimiterOptions()),
    resendVerificationEmail
  );
};
