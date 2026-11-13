import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../utils/app-logger.util';
import { parseTrustProxy } from '../utils/config-validation.util';
import {
  buildGraphqlAnonymousRateLimiterOptions,
  buildGraphqlUserRateLimiterOptions,
} from './graphql-rate-limit.middleware';

const PUBLIC_IP = '203.0.113.7';
const USER_ID = 'c9e8fee1-8cb4-4fff-b335-5ea350615df4';

const buildRequest = ({
  ip = PUBLIC_IP,
  method = 'POST',
  userId,
}: {
  ip?: string;
  method?: string;
  userId?: string;
}) =>
  ({
    ip,
    method,
    path: '/graphql-api',
    headers: {},
    session: userId ? { user: { id: userId } } : {},
  }) as unknown as Request;

const buildResponse = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
};

describe('buildGraphqlUserRateLimiterOptions', () => {
  it('should key the limiter by the signed-in user, whatever the address', async () => {
    // Given
    const keyGenerator = buildGraphqlUserRateLimiterOptions().keyGenerator!;
    const { res } = buildResponse();

    // When
    const first = await keyGenerator(
      buildRequest({ userId: USER_ID, ip: PUBLIC_IP }),
      res
    );
    const second = await keyGenerator(
      buildRequest({ userId: USER_ID, ip: '198.51.100.20' }),
      res
    );

    // Then
    expect(first).toBe(`user:${USER_ID}`);
    expect(second).toBe(first);
  });

  it.each`
    description               | request                                                 | expected
    ${'a signed-in request'}  | ${buildRequest({ userId: USER_ID })}                    | ${false}
    ${'an anonymous request'} | ${buildRequest({})}                                     | ${true}
    ${'a preflight request'}  | ${buildRequest({ userId: USER_ID, method: 'OPTIONS' })} | ${true}
  `(
    'should skip $description: $expected',
    async ({ request, expected }: { request: Request; expected: boolean }) => {
      // When
      const skipped = await buildGraphqlUserRateLimiterOptions().skip!(
        request,
        buildResponse().res
      );

      // Then
      expect(skipped).toBe(expected);
    }
  );
});

describe('buildGraphqlAnonymousRateLimiterOptions', () => {
  it.each`
    description                                      | request                                | expected
    ${'an anonymous request from a public address'}  | ${buildRequest({})}                    | ${false}
    ${'a signed-in request'}                         | ${buildRequest({ userId: USER_ID })}   | ${true}
    ${'the server rendering from a private address'} | ${buildRequest({ ip: '10.0.3.12' })}   | ${true}
    ${'a preflight request'}                         | ${buildRequest({ method: 'OPTIONS' })} | ${true}
  `(
    'should skip $description: $expected',
    async ({ request, expected }: { request: Request; expected: boolean }) => {
      // When
      const skipped = await buildGraphqlAnonymousRateLimiterOptions().skip!(
        request,
        buildResponse().res
      );

      // Then
      expect(skipped).toBe(expected);
    }
  );

  describe('once over the limit', () => {
    let server: Server | undefined;

    afterEach(async () => {
      await new Promise((resolve) => server?.close(resolve));
      server = undefined;
    });

    it('should answer a GraphQL error with the TOO_MANY_REQUESTS code', async () => {
      // Given
      vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
      const app = express();
      // Same value the API gets from TRUST_PROXY=1, so the public forwarded address is the client IP.
      app.set('trust proxy', parseTrustProxy('1'));
      app.post(
        '/graphql-api',
        rateLimit({ ...buildGraphqlAnonymousRateLimiterOptions(), limit: 1 }),
        (_req, res) => {
          res.status(204).end();
        }
      );
      server = app.listen(0);
      await once(server, 'listening');
      const { port } = server.address() as AddressInfo;
      const sendRequest = () =>
        fetch(`http://127.0.0.1:${port}/graphql-api`, {
          method: 'POST',
          headers: { 'x-forwarded-for': PUBLIC_IP },
        });

      // When
      const allowed = await sendRequest();
      const limited = await sendRequest();

      // Then
      expect(allowed.status).toBe(204);
      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({
        errors: [
          {
            message: 'TOO_MANY_REQUESTS',
            extensions: { code: 'TOO_MANY_REQUESTS' },
          },
        ],
      });
    });
  });
});
