import express, { type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../../../utils/app-logger.util';
import { parseTrustProxy } from '../../../utils/config-validation.util';
import { buildIpRateLimiterOptions } from './ip-rate-limit.util';

const CLIENT_A = '198.51.100.20';
const CLIENT_B = '198.51.100.21';
const FORGED_IP = '203.0.113.7';
const OTHER_FORGED_IP = '203.0.113.8';

const buildIpLimiter = () =>
  rateLimit(
    buildIpRateLimiterOptions({
      windowMs: 60 * 1000,
      limit: 1,
      logLabel: 'Test',
      sendRateLimitError: (res) => {
        res.status(429).end();
      },
    })
  );

// The /auth limiter relies on the express-rate-limit default key.
const buildDefaultKeyLimiter = () =>
  rateLimit({ windowMs: 60 * 1000, limit: 1 });

const startServer = async (limiter: RequestHandler) => {
  const app = express();
  // Same value the API gets from TRUST_PROXY=1.
  app.set('trust proxy', parseTrustProxy('1'));
  app.get('/limited', limiter, (_req, res) => {
    res.status(204).end();
  });
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/limited` };
};

const getStatus = async (url: string, forwardedFor: string) =>
  (await fetch(url, { headers: { 'x-forwarded-for': forwardedFor } })).status;

describe.each([
  ['buildIpRateLimiterOptions', buildIpLimiter],
  ['the default key generator', buildDefaultKeyLimiter],
])(
  'ip rate limiting behind one trusted proxy with %s',
  (_description, buildLimiter: () => RequestHandler) => {
    let server: Server | undefined;
    let url: string;

    beforeEach(async () => {
      vi.restoreAllMocks();
      vi.spyOn(logApp, 'warn').mockImplementation(() => {});
      ({ server, url } = await startServer(buildLimiter()));
    });

    afterEach(async () => {
      await new Promise((resolve) => server?.close(resolve));
    });

    it('should share one bucket when only the forged left-hand entries differ', async () => {
      // Given
      const firstForwardedFor = `${FORGED_IP}, ${CLIENT_A}`;
      const secondForwardedFor = `${OTHER_FORGED_IP}, ${CLIENT_A}`;

      // When
      const statuses = [
        await getStatus(url, firstForwardedFor),
        await getStatus(url, secondForwardedFor),
      ];

      // Then
      expect(statuses).toEqual([204, 429]);
    });

    it('should give each client its own bucket when their rightmost entries differ', async () => {
      // Given
      const clients = [CLIENT_A, CLIENT_B, CLIENT_A] as const;

      // When
      const statuses = [
        await getStatus(url, clients[0]),
        await getStatus(url, clients[1]),
        await getStatus(url, clients[2]),
      ];

      // Then
      expect(statuses).toEqual([204, 204, 429]);
    });
  }
);

// Only the default key generator runs the X-Forwarded-For validation: with a
// custom keyGenerator this test would pass whatever the trust proxy value.
describe('ip rate limiting validation with the default key generator', () => {
  let server: Server | undefined;
  let url: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    ({ server, url } = await startServer(buildDefaultKeyLimiter()));
  });

  afterEach(async () => {
    await new Promise((resolve) => server?.close(resolve));
  });

  it('should raise no express-rate-limit validation error when X-Forwarded-For is set', async () => {
    // Given
    const consoleError = vi.spyOn(console, 'error');

    // When
    await getStatus(url, `${FORGED_IP}, ${CLIENT_A}`);

    // Then
    expect(consoleError).not.toHaveBeenCalled();
  });
});
