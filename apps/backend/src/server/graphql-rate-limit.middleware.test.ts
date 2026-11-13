import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { logApp } from '../utils/app-logger.util';
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

  it('should answer a GraphQL error with the TOO_MANY_REQUESTS code', () => {
    // Given
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
    const handler = buildGraphqlAnonymousRateLimiterOptions().handler!;
    const { res, status, json } = buildResponse();

    // When
    handler(buildRequest({}), res, vi.fn(), {} as never);

    // Then
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      errors: [
        {
          message: 'TOO_MANY_REQUESTS',
          extensions: { code: 'TOO_MANY_REQUESTS' },
        },
      ],
    });
  });
});
