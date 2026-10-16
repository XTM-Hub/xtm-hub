import express from 'express';
import expressSession, { MemoryStore, SessionData } from 'express-session';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserLoadUserBy } from '../model/user';
import { getErrorMessage, toError } from './error/error-guard.util';
import { startUserSession } from './session.util';

const SESSION_COOKIE = 'session-util-test';
const REFERER = '/app/settings';
const UNVERIFIED_IDP_SUBJECT = 'auth0|unverified-user';
const STORE_ERROR = 'session store unavailable';
const USER = { id: 'user-1', email: 'user@filigran.io' } as UserLoadUserBy;

interface LoginResult {
  status: number;
  sessionId: string;
  error?: string;
}

describe('startUserSession', () => {
  let server: Server | undefined;
  let baseUrl: string;
  let store: MemoryStore;

  beforeEach(async () => {
    store = new MemoryStore();
    const app = express();
    app.use(
      expressSession({
        name: SESSION_COOKIE,
        store,
        secret: 'session-util-test-secret',
        saveUninitialized: false,
        resave: false,
      })
    );
    // An anonymous visit that leaves data in the pre-login session.
    app.get('/visit', (req, res) => {
      req.session.referer = REFERER;
      req.session.unverifiedIdpSubject = UNVERIFIED_IDP_SUBJECT;
      res.json({ sessionId: req.sessionID });
    });
    app.post('/login', async (req, res) => {
      try {
        await startUserSession(req, USER);
        res.json({ sessionId: req.sessionID });
      } catch (error) {
        res
          .status(500)
          .json({ sessionId: req.sessionID, error: getErrorMessage(error) });
      }
    });
    server = app.listen(0);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise((resolve) => server?.close(resolve));
  });

  const visit = async () => {
    const response = await fetch(`${baseUrl}/visit`);
    const [cookie] = response.headers.getSetCookie();
    const { sessionId } = (await response.json()) as { sessionId: string };
    return { cookie: cookie!.split(';')[0]!, sessionId };
  };

  const login = async (cookie: string): Promise<LoginResult> => {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { cookie },
    });
    const body = (await response.json()) as Omit<LoginResult, 'status'>;
    return { status: response.status, ...body };
  };

  const loadStoredSession = (sessionId: string) =>
    new Promise<SessionData | null | undefined>((resolve, reject) => {
      store.get(sessionId, (err, session) =>
        err ? reject(toError(err)) : resolve(session)
      );
    });

  it('should sign the user into a new session when the pre-login session exists', async () => {
    // Given
    const preLogin = await visit();

    // When
    const result = await login(preLogin.cookie);

    // Then
    expect(result).toMatchObject({ status: 200 });
    expect(result.sessionId).not.toBe(preLogin.sessionId);
    expect(await loadStoredSession(result.sessionId)).toMatchObject({
      user: USER,
    });
  });

  it('should destroy the pre-login session when the user signs in', async () => {
    // Given
    const preLogin = await visit();

    // When
    await login(preLogin.cookie);

    // Then
    expect(await loadStoredSession(preLogin.sessionId)).toBeUndefined();
  });

  it('should carry nothing from the pre-login session into the new one', async () => {
    // Given
    const preLogin = await visit();

    // When
    const result = await login(preLogin.cookie);

    // Then
    const session = await loadStoredSession(result.sessionId);
    expect(session).not.toHaveProperty('referer');
    expect(session).not.toHaveProperty('unverifiedIdpSubject');
  });

  it('should reject and leave the user signed out when the regeneration fails', async () => {
    // Given
    const preLogin = await visit();
    vi.spyOn(store, 'destroy').mockImplementation((_sid, callback) =>
      callback?.(new Error(STORE_ERROR))
    );

    // When
    const result = await login(preLogin.cookie);

    // Then
    expect(result).toMatchObject({ status: 500, error: STORE_ERROR });
    expect(await loadStoredSession(result.sessionId)).not.toHaveProperty(
      'user'
    );
  });

  it('should reject and leave the user signed out when the new session cannot be saved', async () => {
    // Given
    const preLogin = await visit();
    vi.spyOn(store, 'set').mockImplementationOnce((_sid, _session, callback) =>
      callback?.(new Error(STORE_ERROR))
    );

    // When
    const result = await login(preLogin.cookie);

    // Then
    expect(result).toMatchObject({ status: 500, error: STORE_ERROR });
    expect(await loadStoredSession(result.sessionId)).not.toHaveProperty(
      'user'
    );
  });
});
