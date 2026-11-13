import express, {
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import rateLimit from 'express-rate-limit';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from './app-logger.util';
import { parseTrustProxy } from './config-validation.util';
import { ErrorCode } from './error/error.code';
import {
  buildRateLimiterOptions,
  createKeyRateLimiter,
  isPrivateIp,
} from './rate-limit.util';

const CLIENT_A = '198.51.100.20';
const CLIENT_B = '198.51.100.21';
const FORGED_IP = '203.0.113.7';
const OTHER_FORGED_IP = '203.0.113.8';

const buildIpLimiter = () =>
  rateLimit(
    buildRateLimiterOptions({
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
  ['buildRateLimiterOptions', buildIpLimiter],
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

describe('isPrivateIp', () => {
  it.each`
    ip                      | expected
    ${'10.1.2.3'}           | ${true}
    ${'172.20.0.4'}         | ${true}
    ${'192.168.1.10'}       | ${true}
    ${'127.0.0.1'}          | ${true}
    ${'100.64.3.2'}         | ${true}
    ${'::1'}                | ${true}
    ${'fd00::12'}           | ${true}
    ${'::ffff:10.0.0.5'}    | ${true}
    ${undefined}            | ${true}
    ${'203.0.113.7'}        | ${false}
    ${'172.32.0.1'}         | ${false}
    ${'::ffff:203.0.113.7'} | ${false}
    ${'2001:db8::1'}        | ${false}
    ${'not-an-ip'}          | ${false}
  `(
    'should tell that $ip is private: $expected',
    ({ ip, expected }: { ip: string | undefined; expected: boolean }) => {
      // When
      const result = isPrivateIp(ip);

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('createKeyRateLimiter', () => {
  it('should refuse a key over the limit and keep the other keys apart', async () => {
    // Given
    const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 2 });
    await limiter.tryConsume('a');
    await limiter.tryConsume('a');

    // When
    const third = await limiter.tryConsume('a');
    const other = await limiter.tryConsume('b');

    // Then
    expect(third).toBe(false);
    expect(other).toBe(true);
  });

  it('should allow a key again once reset', async () => {
    // Given
    const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 1 });
    await limiter.tryConsume('a');
    await limiter.reset();

    // When
    const result = await limiter.tryConsume('a');

    // Then
    expect(result).toBe(true);
  });
});

describe('createKeyRateLimiter.consumeOrThrow', () => {
  it('should throw TOO_MANY_REQUESTS once the key is over the limit', async () => {
    // Given
    const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 1 });
    await limiter.consumeOrThrow('a');

    // When
    const call = limiter.consumeOrThrow('a');

    // Then
    await expect(call).rejects.toThrow(ErrorCode.TooManyRequests);
  });
});

describe('createKeyRateLimiter.tryConsumeForIp', () => {
  it.each`
    description                                    | firstIp          | secondIp          | expected
    ${'the same key twice from one address'}       | ${'203.0.113.7'} | ${'203.0.113.7'}  | ${false}
    ${'the same key from two addresses'}           | ${'203.0.113.7'} | ${'198.51.100.2'} | ${true}
    ${'the same key twice from a private address'} | ${'10.0.3.12'}   | ${'10.0.3.12'}    | ${true}
  `(
    'should allow $description: $expected',
    async ({
      firstIp,
      secondIp,
      expected,
    }: {
      firstIp: string;
      secondIp: string;
      expected: boolean;
    }) => {
      // Given
      const limiter = createKeyRateLimiter({ windowMs: 60 * 1000, limit: 1 });
      await limiter.tryConsumeForIp(firstIp, 'document-1');

      // When
      const result = await limiter.tryConsumeForIp(secondIp, 'document-1');

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('buildRateLimiterOptions.skip', () => {
  const buildRequest = (ip: string, path = '/limited') =>
    ({ ip, path }) as unknown as Request;

  it.each`
    description                               | config                     | ip               | expected
    ${'nothing by default'}                   | ${{}}                      | ${'10.0.3.12'}   | ${false}
    ${'a private address with skipPrivateIp'} | ${{ skipPrivateIp: true }} | ${'10.0.3.12'}   | ${true}
    ${'a public address with skipPrivateIp'}  | ${{ skipPrivateIp: true }} | ${'203.0.113.7'} | ${false}
    ${'what the given skip leaves out'}       | ${{ skip: () => true }}    | ${'203.0.113.7'} | ${true}
  `(
    'should skip $description: $expected',
    async ({
      config,
      ip,
      expected,
    }: {
      config: { skipPrivateIp?: boolean; skip?: () => boolean };
      ip: string;
      expected: boolean;
    }) => {
      // Given
      const options = buildRateLimiterOptions({
        windowMs: 60 * 1000,
        limit: 1,
        logLabel: 'Test',
        ...config,
      });

      // When
      const skipped = await options.skip!(buildRequest(ip), {} as Response);

      // Then
      expect(skipped).toBe(expected);
    }
  );
});
