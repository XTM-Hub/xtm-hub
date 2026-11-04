import type { Request } from 'express';
import {
  calculatePKCECodeChallenge,
  Configuration,
  customFetch,
} from 'openid-client';
import type passport from 'passport';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_PENDING_AUTHORIZATION_REQUESTS,
  OIDCStrategy,
  UNVERIFIABLE_AUTHORIZATION_REQUEST,
} from './oidc-strategy';

const ISSUER = 'https://idp.example.com/';
const ISSUER_HOST = 'idp.example.com';
const HUB_HOST = 'hub.example.com';
const CALLBACK_URL = `https://${HUB_HOST}/auth/oidc/callback`;
const LEGACY_CODE_VERIFIER = 'legacy-code-verifier';

type Session = Record<string, unknown>;

type Outcome =
  | { kind: 'redirect'; url: URL }
  | { kind: 'success'; user: unknown }
  | { kind: 'fail'; info: unknown }
  | { kind: 'error'; error: unknown };

interface StartedSignIn {
  state: string;
  codeChallenge: string;
}

describe('oidc strategy', () => {
  let tokenRequests: URLSearchParams[];
  let strategy: OIDCStrategy;
  let session: Session;

  beforeEach(() => {
    tokenRequests = [];
    session = {};
    const config = new Configuration(
      {
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}authorize`,
        token_endpoint: `${ISSUER}oauth/token`,
        code_challenge_methods_supported: ['S256'],
      },
      'client-id',
      'client-secret'
    );
    config[customFetch] = async (_url, options) => {
      tokenRequests.push(new URLSearchParams(options.body as URLSearchParams));
      return Response.json({
        access_token: 'access-token',
        token_type: 'bearer',
      });
    };
    strategy = new OIDCStrategy(
      { config, passReqToCallback: true, callbackURL: CALLBACK_URL },
      (_req, tokens, done) => done(null, { accessToken: tokens.access_token })
    );
  });

  // Runs the strategy the way passport does: on a per-request copy that
  // receives the outcome callbacks.
  const authenticate = (path: string) =>
    new Promise<Outcome>((resolve) => {
      const req = {
        method: 'GET',
        protocol: 'https',
        originalUrl: path,
        session,
        app: { get: () => () => false },
        socket: {},
        get: (header: string) => (header === 'host' ? HUB_HOST : undefined),
      } as unknown as Request;
      const created = Object.assign(Object.create(strategy) as OIDCStrategy, {
        redirect: (url: string) =>
          resolve({ kind: 'redirect', url: new URL(url) }),
        success: (user: unknown) => resolve({ kind: 'success', user }),
        fail: (info: unknown) => resolve({ kind: 'fail', info }),
        error: (error: unknown) => resolve({ kind: 'error', error }),
      }) as unknown as passport.StrategyCreated<
        OIDCStrategy,
        OIDCStrategy & passport.StrategyCreatedStatic
      >;
      created.authenticate(req, {});
    });

  const startSignIn = async (): Promise<StartedSignIn> => {
    const outcome = await authenticate('/auth/oidc');
    if (outcome.kind !== 'redirect') {
      throw new Error(`Expected a redirect, got ${outcome.kind}`);
    }
    const state = outcome.url.searchParams.get('state');
    const codeChallenge = outcome.url.searchParams.get('code_challenge');
    if (!state || !codeChallenge) {
      throw new Error('The authorization URL has no state or code challenge');
    }
    return { state, codeChallenge };
  };

  const completeSignIn = (state?: string) =>
    authenticate(
      `/auth/oidc/callback?code=authorization-code${state ? `&state=${state}` : ''}`
    );

  const lastSentCodeChallenge = async () => {
    const codeVerifier = tokenRequests.at(-1)?.get('code_verifier');
    if (!codeVerifier) {
      throw new Error('No code verifier was sent to the token endpoint');
    }
    return calculatePKCECodeChallenge(codeVerifier);
  };

  it('should send a state with the authorization request', async () => {
    // When
    const signIn = await startSignIn();

    // Then
    expect(signIn.state).not.toBe('');
  });

  it('should complete a sign-in with the verifier of its own request', async () => {
    // Given
    const signIn = await startSignIn();

    // When
    const outcome = await completeSignIn(signIn.state);

    // Then
    expect(outcome).toEqual({
      kind: 'success',
      user: { accessToken: 'access-token' },
    });
    expect(await lastSentCodeChallenge()).toBe(signIn.codeChallenge);
  });

  it.each([
    ['the first one', [0, 1]],
    ['the latest one', [1, 0]],
  ])(
    'should complete two overlapping sign-ins of one session, %s first',
    async (_description, order) => {
      // Given
      const signIns = [await startSignIn(), await startSignIn()];

      for (const index of order) {
        const signIn = signIns[index];
        // When
        const outcome = await completeSignIn(signIn.state);

        // Then
        expect(outcome.kind).toBe('success');
        expect(await lastSentCodeChallenge()).toBe(signIn.codeChallenge);
      }
    }
  );

  it('should refuse a callback whose state belongs to no request, and keep the pending one', async () => {
    // Given
    const signIn = await startSignIn();

    // When
    const outcome = await completeSignIn('unknown-state');

    // Then
    expect(outcome).toEqual({
      kind: 'fail',
      info: { message: UNVERIFIABLE_AUTHORIZATION_REQUEST },
    });
    expect(tokenRequests).toHaveLength(0);
    expect((await completeSignIn(signIn.state)).kind).toBe('success');
  });

  it('should refuse a callback replayed after its sign-in completed', async () => {
    // Given
    const signIn = await startSignIn();
    await completeSignIn(signIn.state);

    // When
    const outcome = await completeSignIn(signIn.state);

    // Then
    expect(outcome.kind).toBe('fail');
    expect(tokenRequests).toHaveLength(1);
  });

  it('should drop the oldest sign-ins beyond the pending limit', async () => {
    // Given
    const signIns: StartedSignIn[] = [];
    for (let i = 0; i < MAX_PENDING_AUTHORIZATION_REQUESTS + 2; i++) {
      signIns.push(await startSignIn());
    }
    const [oldest, ...kept] = signIns;

    // When
    const oldestOutcome = await completeSignIn(oldest.state);

    // Then
    expect(oldestOutcome.kind).toBe('fail');
    for (const signIn of kept) {
      expect((await completeSignIn(signIn.state)).kind).toBe('success');
    }
  });

  it('should complete a sign-in started before requests carried a state', async () => {
    // Given
    session[ISSUER_HOST] = { code_verifier: LEGACY_CODE_VERIFIER };

    // When
    const outcome = await completeSignIn();

    // Then
    expect(outcome.kind).toBe('success');
    expect(tokenRequests.at(-1)?.get('code_verifier')).toBe(
      LEGACY_CODE_VERIFIER
    );
  });
});
