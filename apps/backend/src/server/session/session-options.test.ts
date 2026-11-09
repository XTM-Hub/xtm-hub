import express from 'express';
import expressSession, { MemoryStore } from 'express-session/index.js';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSessionOptions } from './session-options';

const COOKIE_NAME = 'test-session';
const LOOPBACK_IP = '127.0.0.1';

const startServer = async () => {
  const app = express();
  app.use(
    expressSession(
      buildSessionOptions({
        name: COOKIE_NAME,
        secret: 'test-secret',
        store: new MemoryStore(),
      })
    )
  );
  // saveUninitialized is false: the session must be modified for the cookie to be sent.
  app.get('/login', (req, res) => {
    Object.assign(req.session, { touched: true });
    res.sendStatus(204);
  });
  const server = app.listen(0, LOOPBACK_IP);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://${LOOPBACK_IP}:${port}/login` };
};

const getSessionCookie = async (
  url: string,
  headers: Record<string, string> = {}
) => {
  const response = await fetch(url, { headers });
  return response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
};

describe('buildSessionOptions', () => {
  let server: Server;
  let url: string;

  beforeEach(async () => {
    ({ server, url } = await startServer());
  });

  afterEach(() => {
    server.close();
  });

  it('should set the session cookie with Secure when the ingress forwards an https request', async () => {
    const cookie = await getSessionCookie(url, {
      'x-forwarded-proto': 'https',
    });

    expect(cookie).toBeDefined();
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('should still set the session cookie, without Secure, over plain http', async () => {
    const cookie = await getSessionCookie(url);

    expect(cookie).toBeDefined();
    expect(cookie).not.toContain('Secure');
    expect(cookie).toContain('HttpOnly');
  });
});
