import type { Request } from 'express';
import type { SessionData } from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { vi } from 'vitest';
import { getSessionStoreInstance } from '../../src/session-store-manager';

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

const STORED_SESSION_MAX_AGE_MS = 60 * 60 * 1000;

const toStoreCallback =
  (resolve: () => void, reject: (err: unknown) => void) => (err?: unknown) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  };

/**
 * Saves a session in the configured session store, as express-session does
 * at login, and returns its id.
 */
const create = async (data: Partial<SessionData>): Promise<string> => {
  const sessionId = `test-session-${uuidv4()}`;
  const session = {
    cookie: {
      originalMaxAge: STORED_SESSION_MAX_AGE_MS,
      maxAge: STORED_SESSION_MAX_AGE_MS,
    },
    ...data,
  } as SessionData;
  await new Promise<void>((resolve, reject) => {
    getSessionStoreInstance().set(
      sessionId,
      session,
      toStoreCallback(resolve, reject)
    );
  });
  return sessionId;
};

const load = (sessionId: string): Promise<SessionData | null> =>
  new Promise((resolve, reject) => {
    getSessionStoreInstance().get(sessionId, (err, session) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(session ?? null);
    });
  });

const remove = (sessionId: string): Promise<void> =>
  new Promise((resolve, reject) => {
    getSessionStoreInstance().destroy(
      sessionId,
      toStoreCallback(resolve, reject)
    );
  });

const clear = (): Promise<void> =>
  new Promise((resolve, reject) => {
    getSessionStoreInstance().clear(toStoreCallback(resolve, reject));
  });

export const TestSessionHelper = {
  session: {
    buildRequest,
    create,
    load,
    delete: remove,
    clear,
  },
};
