import { Express, NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticateInner: vi.fn(),
  authenticate: vi.fn(),
  isSessionUserActive: vi.fn(),
  authenticateUser: vi.fn(),
}));

vi.mock('./provider/providers', () => ({
  initProviders: vi.fn(async () => ({ authenticate: mocks.authenticate })),
}));

vi.mock('./auth-user', () => ({
  isSessionUserActive: mocks.isSessionUserActive,
  authenticateUser: mocks.authenticateUser,
}));

vi.mock('../../../context/request.context', () => ({
  requestContext: { set: vi.fn(), get: vi.fn() },
}));

import { ForbiddenErrorCode } from '../../../utils/error/error.code';
import { initAuthPlatform } from './auth-platform';

type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

interface RegisteredApp {
  handler: RouteHandler;
  middlewares: RouteHandler[];
  authMiddleware: RouteHandler;
  callbackHandler: RouteHandler;
}

const registerAuthPlatform = async (): Promise<RegisteredApp> => {
  let handler: RouteHandler | undefined;
  let middlewares: RouteHandler[] = [];
  let authMiddleware: RouteHandler | undefined;
  let callbackHandler: RouteHandler | undefined;

  const app = {
    use: (path: string, middleware: RouteHandler) => {
      if (path === '/auth') {
        authMiddleware = middleware;
      }
    },
    get: (path: string, ...handlers: RouteHandler[]) => {
      if (path === '/auth/:provider') {
        middlewares = handlers.slice(0, -1);
        handler = handlers[handlers.length - 1];
      }
    },
    all: (path: string, ...handlers: RouteHandler[]) => {
      if (path === '/auth/:provider/callback') {
        callbackHandler = handlers[handlers.length - 1];
      }
    },
  } as unknown as Express;

  await initAuthPlatform(app);

  if (!handler || !authMiddleware || !callbackHandler) {
    throw new Error('/auth routes were not registered as expected');
  }
  return { handler, middlewares, authMiddleware, callbackHandler };
};

const buildRequest = (
  overrides: {
    user?: object;
    redirect?: unknown;
    provider?: string;
    referer?: string;
  } = {}
) =>
  ({
    params: { provider: overrides.provider ?? 'oidc' },
    query: 'redirect' in overrides ? { redirect: overrides.redirect } : {},
    session: { user: overrides.user, referer: overrides.referer },
  }) as unknown as Request;

const buildResponse = () =>
  ({
    redirect: vi.fn(),
    cookie: vi.fn(),
    set: vi.fn(),
    vary: vi.fn(),
  }) as unknown as Response;

const activeUser = { id: 'user-1' };

describe('initAuthPlatform', () => {
  let app: RegisteredApp;

  beforeEach(async () => {
    mocks.authenticate.mockImplementation(() => mocks.authenticateInner);
    mocks.isSessionUserActive.mockResolvedValue(false);
    app = await registerAuthPlatform();
  });

  describe('cache directives on /auth', () => {
    it('should forbid shared caches from reusing session dependent responses', () => {
      const res = buildResponse();
      const next = vi.fn();

      app.authMiddleware(buildRequest(), res, next);

      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(res.vary).toHaveBeenCalledWith('Cookie');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('when the session user is still active', () => {
    beforeEach(() => {
      mocks.isSessionUserActive.mockResolvedValue(true);
    });

    it.each`
      redirect                                     | expected                               | description
      ${undefined}                                 | ${'/app'}                              | ${'no redirect param'}
      ${btoa('/app/service/opencti_integrations')} | ${'/app/service/opencti_integrations'} | ${'safe relative redirect'}
      ${btoa('https://evil.test')}                 | ${'/app'}                              | ${'absolute url rejected'}
      ${btoa('//evil.test')}                       | ${'/app'}                              | ${'protocol-relative url rejected'}
      ${btoa('/\\evil.test')}                      | ${'/app'}                              | ${'backslash url rejected'}
      ${btoa('/app\r\nx: y')}                      | ${'/app'}                              | ${'CRLF payload rejected'}
      ${'not-base64-!!'}                           | ${'/app'}                              | ${'malformed base64 redirect'}
      ${''}                                        | ${'/app'}                              | ${'empty redirect param'}
      ${['/app/a', '/app/b']}                      | ${'/app'}                              | ${'repeated redirect param'}
    `(
      'should redirect to "$expected" ($description)',
      async ({ redirect, expected }) => {
        const req = buildRequest({ user: activeUser, redirect });
        const res = buildResponse();
        const next = vi.fn();

        await app.handler(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith(expected);
        expect(mocks.authenticate).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      }
    );

    it('should overwrite a stale referer left by an abandoned sign-in', async () => {
      const req = buildRequest({ user: activeUser, referer: '/app/stale' });

      await app.handler(req, buildResponse(), vi.fn());

      expect(req.session.referer).toBeUndefined();
    });

    it('should not set an error cookie', async () => {
      const res = buildResponse();

      await app.handler(buildRequest({ user: activeUser }), res, vi.fn());

      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('when the session user is no longer valid', () => {
    it('should run the full sign-in flow for a disabled or deleted user', async () => {
      mocks.isSessionUserActive.mockResolvedValue(false);
      const req = buildRequest({ user: { id: 'disabled-user' } });
      const res = buildResponse();
      const next = vi.fn();

      await app.handler(req, res, next);

      expect(mocks.authenticate).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should propagate a revalidation failure instead of trusting the session', async () => {
      mocks.isSessionUserActive.mockRejectedValue(new Error('db unreachable'));
      const res = buildResponse();
      const next = vi.fn();

      await app.handler(buildRequest({ user: activeUser }), res, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(mocks.authenticate).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('when the session is anonymous', () => {
    it('should start the provider authentication flow', async () => {
      const req = buildRequest();
      const res = buildResponse();
      const next = vi.fn();

      await app.handler(req, res, next);

      expect(mocks.authenticate).toHaveBeenCalledWith(
        'oidc',
        {},
        expect.any(Function)
      );
      expect(mocks.authenticateInner).toHaveBeenCalledWith(req, res, next);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should store the safe redirect as session referer', async () => {
      const req = buildRequest({
        redirect: btoa('/app/service/opencti_integrations'),
      });

      await app.handler(req, buildResponse(), vi.fn());

      expect(req.session.referer).toBe('/app/service/opencti_integrations');
    });

    it('should not store an unsafe redirect as session referer', async () => {
      const req = buildRequest({ redirect: btoa('/\\evil.test') });

      await app.handler(req, buildResponse(), vi.fn());

      expect(req.session.referer).toBeUndefined();
    });

    it('should redirect to root when the provider is missing', async () => {
      const req = buildRequest({ provider: '' });
      const res = buildResponse();

      await app.handler(req, res, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(mocks.authenticate).not.toHaveBeenCalled();
      expect(mocks.isSessionUserActive).not.toHaveBeenCalled();
    });
  });

  describe('on the provider callback', () => {
    type PassportOutcome = [Error | null, object | false | null, unknown?];

    const givenPassportOutcome = (...outcome: PassportOutcome) => {
      mocks.authenticate.mockImplementation(
        (
          _provider: string,
          _options: object,
          callback: (...args: PassportOutcome) => void
        ) =>
          () =>
            callback(...outcome)
      );
    };

    it.each([
      [
        'the email is not verified',
        [new Error(ForbiddenErrorCode.EmailNotVerified), undefined],
        '/sign-up?error=email-not-verified',
      ],
      [
        'the provider strategy fails',
        [new Error('boom'), undefined],
        '/sign-up?error=login-failed',
      ],
      [
        'the identity provider denies the sign-in',
        [null, false, { message: 'access denied' }],
        '/sign-up?error=login-failed',
      ],
    ] as [string, PassportOutcome, string][])(
      'should send the user to the sign-up page with the reason when %s',
      async (_description, outcome, expected) => {
        // Given
        givenPassportOutcome(...outcome);
        const res = buildResponse();

        // When
        await app.callbackHandler(buildRequest(), res, vi.fn());

        // Then
        expect(res.redirect).toHaveBeenCalledWith(expected);
      }
    );

    it('should keep the referer for the next attempt when the sign-in fails', async () => {
      // Given
      givenPassportOutcome(new Error('boom'), undefined);
      const res = buildResponse();

      // When
      await app.callbackHandler(
        buildRequest({ referer: '/app' }),
        res,
        vi.fn()
      );

      // Then
      expect(res.redirect).toHaveBeenCalledWith(
        '/sign-up?error=login-failed&redirect=L2FwcA%3D%3D'
      );
    });

    it('should send the user to the sign-up page when the account is missing or disabled', async () => {
      // Given
      givenPassportOutcome(null, activeUser);
      mocks.authenticateUser.mockResolvedValue(undefined);
      const res = buildResponse();

      // When
      await app.callbackHandler(buildRequest(), res, vi.fn());

      // Then
      expect(res.redirect).toHaveBeenCalledWith('/sign-up?error=login-failed');
    });

    it('should send the user to the sign-up page with the referer when the session cannot be started', async () => {
      // Given
      givenPassportOutcome(null, activeUser);
      mocks.authenticateUser.mockRejectedValue(new Error('store unavailable'));
      const res = buildResponse();

      // When
      await app.callbackHandler(
        buildRequest({ referer: '/app' }),
        res,
        vi.fn()
      );

      // Then
      expect(res.redirect).toHaveBeenCalledWith(
        '/sign-up?error=login-failed&redirect=L2FwcA%3D%3D'
      );
    });

    it('should send a signed-in user back to the referer', async () => {
      // Given
      givenPassportOutcome(null, activeUser);
      mocks.authenticateUser.mockResolvedValue(activeUser);
      const res = buildResponse();

      // When
      await app.callbackHandler(
        buildRequest({ referer: '/app/settings' }),
        res,
        vi.fn()
      );

      // Then
      expect(res.redirect).toHaveBeenCalledWith('/app/settings');
    });

    it('should send a signed-in user back to the referer of the session replaced at login', async () => {
      // Given
      givenPassportOutcome(null, activeUser);
      mocks.authenticateUser.mockImplementation(async (req: Request) => {
        req.session = { user: activeUser } as unknown as Request['session'];
        return activeUser;
      });
      const res = buildResponse();

      // When
      await app.callbackHandler(
        buildRequest({ referer: '/app/settings' }),
        res,
        vi.fn()
      );

      // Then
      expect(res.redirect).toHaveBeenCalledWith('/app/settings');
    });
  });
});
