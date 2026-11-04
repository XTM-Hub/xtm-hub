import type { Request } from 'express';
import { randomState } from 'openid-client';
import {
  Strategy,
  type AuthenticateOptions,
  type StrategyOptionsWithRequest,
  type VerifyFunctionWithRequest,
} from 'openid-client/passport';
import type passport from 'passport';

// What openid-client keeps in the session between the authorization request
// and its callback.
interface AuthorizationRequestState {
  code_verifier: string;
  state: string;
  nonce?: string;
  max_age?: number;
}

interface SessionKeys {
  // The slot openid-client reads and writes.
  current: string;
  // The earlier requests of the session, set aside.
  pending: string;
}

type SessionRecord = Record<string, unknown>;

// How openid-client fails a callback whose authorization request is not in
// the session.
export const UNVERIFIABLE_AUTHORIZATION_REQUEST =
  'Unable to verify authorization request state';

// Earlier sign-ins of a session that can still complete: enough for a double
// click or a few tabs, bounded so the session cannot grow without limit.
export const MAX_PENDING_AUTHORIZATION_REQUESTS = 5;

// Only a request with a `state` can be told apart from the others.
const isAuthorizationRequestState = (
  value: unknown
): value is AuthorizationRequestState =>
  typeof value === 'object' &&
  value !== null &&
  'code_verifier' in value &&
  typeof value.code_verifier === 'string' &&
  'state' in value &&
  typeof value.state === 'string';

const readPendingRequests = (session: SessionRecord, keys: SessionKeys) => {
  const pending = session[keys.pending];
  return Array.isArray(pending)
    ? pending.filter(isAuthorizationRequestState)
    : [];
};

// Moves the request in the openid-client slot to the pending ones, so the slot
// is free for another request. Only the most recent `limit` are kept.
const setAsideCurrentRequest = (
  session: SessionRecord,
  keys: SessionKeys,
  limit = Infinity
) => {
  const current = session[keys.current];
  session[keys.current] = undefined;
  if (!isAuthorizationRequestState(current)) {
    return;
  }
  const pending = readPendingRequests(session, keys).filter(
    (request) => request.state !== current.state
  );
  session[keys.pending] = [...pending, current].slice(-limit);
};

// Puts the request the callback `state` belongs to in the openid-client slot.
// Without a match the slot stays empty, so openid-client fails the callback
// without consuming the request of another sign-in.
const restoreRequest = (
  session: SessionRecord,
  keys: SessionKeys,
  state: string | null
) => {
  const current = session[keys.current];
  // No `state`: a sign-in started before this strategy, or a response
  // openid-client rejects on its own.
  if (
    !state ||
    (isAuthorizationRequestState(current) && current.state === state)
  ) {
    return;
  }
  // Not trimmed: a callback must not drop the request of another sign-in. The
  // next authorization request trims the list again.
  setAsideCurrentRequest(session, keys);
  const pending = readPendingRequests(session, keys);
  const match = pending.find((request) => request.state === state);
  if (!match) {
    return;
  }
  session[keys.pending] = pending.filter((request) => request !== match);
  session[keys.current] = match;
};

/**
 * openid-client keeps one authorization request per session, and sends no
 * `state` to an issuer that supports PKCE (Auth0 does). A second sign-in
 * started in the same session (double click, two tabs, retry) overwrote the
 * PKCE verifier of the first one, whose callback then failed at the token
 * endpoint with "Failed to verify code verifier".
 *
 * This strategy sends a `state`, and sets the earlier requests of the session
 * aside instead of losing them: each callback gets back the request its
 * `state` belongs to.
 */
export class OIDCStrategy extends Strategy {
  readonly sessionKeys: SessionKeys;

  constructor(
    options: StrategyOptionsWithRequest,
    verify: VerifyFunctionWithRequest
  ) {
    super(options, verify);
    // Same default as openid-client.
    const current =
      options.sessionKey ??
      new URL(options.config.serverMetadata().issuer).host;
    this.sessionKeys = { current, pending: `${current}:pending` };
  }

  override authorizationRequestParams<TOptions extends AuthenticateOptions>(
    req: Request,
    options: TOptions
  ) {
    const params = new URLSearchParams(
      super.authorizationRequestParams(req, options)
    );
    // openid-client stores the `state` of the authorization URL with the
    // request and rejects a callback that does not carry the same one.
    params.set('state', randomState());
    return params;
  }

  override authenticate<TOptions extends AuthenticateOptions>(
    this: passport.StrategyCreated<
      OIDCStrategy,
      OIDCStrategy & passport.StrategyCreatedStatic
    >,
    req: Request,
    options: TOptions
  ): void {
    // Without a session, openid-client reports the missing middleware.
    if (req.session) {
      const session = req.session as unknown as SessionRecord;
      const currentUrl = this.currentUrl(req);
      if (this.shouldInitiateAuthRequest(req, currentUrl, options)) {
        setAsideCurrentRequest(
          session,
          this.sessionKeys,
          MAX_PENDING_AUTHORIZATION_REQUESTS
        );
      } else {
        restoreRequest(
          session,
          this.sessionKeys,
          currentUrl.searchParams.get('state')
        );
      }
    }
    super.authenticate(req, options);
  }
}
