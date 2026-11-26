import express from 'express';
import { MemoryStore } from 'express-session/index.js';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSessionMiddlewares } from './session.middleware';

const COOKIE_NAME = 'test-session';
const LOOPBACK_IP = '127.0.0.1';
const LOGIN_PATH = '/login';
const READ_ONLY_PATH = '/read-only';

const startServer = async () => {
  const app = express();
  const { sessionMiddleware, readOnlySessionMiddleware } =
    createSessionMiddlewares({
      name: COOKIE_NAME,
      secret: 'test-secret',
      store: new MemoryStore(),
    });
  // Same order as the real app: the read only route is registered before the session middleware
  app.get(READ_ONLY_PATH, readOnlySessionMiddleware, (req, res) => {
    res.json({ loggedIn: 'loggedIn' in req.session });
  });
  app.use(sessionMiddleware);
  // saveUninitialized is false: the session must be modified for the cookie to be sent.
  app.get(LOGIN_PATH, (req, res) => {
    Object.assign(req.session, { loggedIn: true });
    res.sendStatus(204);
  });
  const server = app.listen(0, LOOPBACK_IP);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://${LOOPBACK_IP}:${port}` };
};

const getSessionCookie = (response: Response) =>
  response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

describe('createSessionMiddlewares', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    ({ server, baseUrl } = await startServer());
  });

  afterEach(() => {
    server.closeAllConnections();
    server.close();
  });

  it('should set the session cookie with Secure when the ingress forwards an https request', async () => {
    // Given a request that reached the ingress over https
    const headers = { 'x-forwarded-proto': 'https' };

    // When the user logs in
    const response = await fetch(`${baseUrl}${LOGIN_PATH}`, { headers });

    // Then the session cookie is Secure
    const cookie = getSessionCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('should still set the session cookie, without Secure, over plain http', async () => {
    // Given a plain http request, as in local dev and CI
    // When the user logs in
    const response = await fetch(`${baseUrl}${LOGIN_PATH}`);

    // Then the session cookie is set without Secure
    const cookie = getSessionCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie).not.toContain('Secure');
    expect(cookie).toContain('HttpOnly');
  });

  it('should read the session created by the session middleware when the route is read only', async () => {
    // Given a logged in user
    const loginResponse = await fetch(`${baseUrl}${LOGIN_PATH}`);
    const cookie = getSessionCookie(loginResponse)?.split(';')[0] ?? '';

    // When the user calls a read only route with their session cookie
    const response = await fetch(`${baseUrl}${READ_ONLY_PATH}`, {
      headers: { cookie },
    });

    // Then the read only route sees the same session
    expect(await response.json()).toEqual({ loggedIn: true });
  });
});
