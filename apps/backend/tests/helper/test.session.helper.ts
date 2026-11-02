import type { Request } from 'express';
import type { SessionData } from 'express-session';
import { vi } from 'vitest';

type SessionCallback = (err?: unknown) => void;

const PRE_LOGIN_SESSION_ID = 'pre-login-session-id';
const REGENERATED_SESSION_ID = 'regenerated-session-id';

interface FakeSessionOptions {
  regenerateError?: Error;
}

/**
 * Stands in for express-session on a request: `regenerate` swaps
 * `req.session` for an empty session under a new id, as the real store does,
 * and `save` succeeds.
 */
const buildRequest = (
  data: Partial<SessionData> = {},
  { regenerateError }: FakeSessionOptions = {}
): Request => {
  const req = { sessionID: PRE_LOGIN_SESSION_ID } as Request;
  const buildSession = (sessionData: Partial<SessionData>) => {
    const session = {
      ...sessionData,
      regenerate: vi.fn((callback: SessionCallback) => {
        if (regenerateError) {
          callback(regenerateError);
          return session;
        }
        req.sessionID = REGENERATED_SESSION_ID;
        req.session = buildSession({});
        callback();
        return session;
      }),
      save: vi.fn((callback?: SessionCallback) => {
        callback?.();
        return session;
      }),
    } as unknown as Request['session'];
    return session;
  };
  req.session = buildSession(data);
  return req;
};

export const TestSessionHelper = {
  session: {
    buildRequest,
  },
};
