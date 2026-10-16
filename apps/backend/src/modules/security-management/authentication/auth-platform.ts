import bodyParser from 'body-parser';
import { Express, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { requestContext } from '../../../context/request.context';
import { UserInfo } from '../../../model/user';
import { SYSTEM_USER_CONTEXT } from '../../../portal.const';
import { AppLogsCategory, logApp } from '../../../utils/app-logger.util';
import {
  getErrorMessage,
  toError,
} from '../../../utils/error/error-guard.util';
import { setCookieError } from '../../../utils/set-cookies.util';
import {
  AUTHENTICATED_HOME,
  buildSignInErrorRedirect,
  resolveSafeRedirect,
} from './auth-redirect.util';
import { authenticateUser, isSessionUserActive } from './auth-user';
import { initProviders } from './provider/providers';

const authProviderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const initAuthPlatform = async (app: Express) => {
  logApp.debug('initAuthPlatform');
  const passport = await initProviders();

  // Responses depend on the session cookie, so a shared cache must never reuse
  // one visitor's redirect for another.
  app.use('/auth', (_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    res.vary('Cookie');
    next();
  });

  app.get(
    `/auth/:provider`,
    authProviderRateLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const providerParam = req.params.provider;
        const provider = Array.isArray(providerParam)
          ? providerParam[0]
          : providerParam;
        if (!provider) {
          setCookieError(res, 'Missing authentication provider');
          res.redirect('/');
          return;
        }
        // Referer header is attacker-controlled — only the explicit redirect
        // param is considered, and only after being sanitized.
        const safeRedirect = resolveSafeRedirect(req.query.redirect);
        req.session.referer = safeRedirect;
        requestContext.set(SYSTEM_USER_CONTEXT);

        // Already signed in: skip the provider round-trip. The session snapshot
        // is not trusted on its own, a stale one falls back to a full sign-in.
        if (await isSessionUserActive(req.session.user)) {
          res.redirect(safeRedirect ?? AUTHENTICATED_HOME);
          return;
        }

        passport.authenticate(provider, {}, (err: Error | null) => {
          setCookieError(res, err?.message);
          next(err);
        })(req, res, next);
      } catch (e) {
        setCookieError(res, getErrorMessage(e));
        next(e);
      }
    }
  );

  const urlencodedParser = bodyParser.urlencoded({ extended: true });
  app.all(
    `/auth/:provider/callback`,
    urlencodedParser,
    async (req: Request, res: Response, next: NextFunction) => {
      const providerParam = req.params.provider;
      const provider = Array.isArray(providerParam)
        ? providerParam[0]
        : providerParam;
      if (!provider) {
        setCookieError(res, 'Missing authentication provider');
        res.redirect('/');
        return;
      }
      const referer = req.session.referer;
      try {
        requestContext.set(SYSTEM_USER_CONTEXT);
        const user: UserInfo = await new Promise((resolve, reject) => {
          passport.authenticate(
            provider,
            {},
            (
              err: Error | null,
              user: UserInfo | false | null,
              info: unknown
            ) => {
              if (err) {
                reject(err);
              } else if (!user) {
                // A failure reported by the IdP (e.g. access denied) carries
                // no error, only its reason in `info`.
                logApp.warn(
                  'Authentication failed at the identity provider',
                  { info },
                  AppLogsCategory.LOGIN_PROVIDER
                );
                reject(new Error('User not provided'));
              } else {
                resolve(user);
              }
            }
          )(req, res, next);
        });

        // Signing in regenerates the session: `referer` was read beforehand.
        const logged = await authenticateUser(req, res, user);
        if (!logged) {
          logApp.warn(
            'Signed-in user is missing or disabled',
            { provider },
            AppLogsCategory.LOGIN_PROVIDER
          );
        }
        res.redirect(
          logged
            ? (referer ?? AUTHENTICATED_HOME)
            : buildSignInErrorRedirect(undefined, referer)
        );
      } catch (err) {
        const normalizedError = toError(err);
        logApp.error(normalizedError, { provider });
        setCookieError(
          res,
          'Invalid authentication, please ask your administrator'
        );
        res.redirect(buildSignInErrorRedirect(normalizedError, referer));
      }
    }
  );
};
