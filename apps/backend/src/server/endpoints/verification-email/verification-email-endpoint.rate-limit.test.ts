import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../../../utils/app-logger.util';
import {
  buildVerificationEmailIpRateLimiterOptions,
  buildVerificationEmailSubjectRateLimiterOptions,
} from './verification-email-endpoint.rate-limit';

const IDP_SUBJECT = 'auth0|unverified-user';

const buildRequest = (ip: string, unverifiedIdpSubject?: string) =>
  ({
    ip,
    path: '/auth/verification-email',
    session: { unverifiedIdpSubject },
  }) as unknown as Request;

const buildResponse = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
};

describe('buildVerificationEmailSubjectRateLimiterOptions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logApp, 'warn').mockImplementation(() => {});
  });

  it('should share one bucket per refused account whatever the IP', async () => {
    // Given
    const keyGenerator =
      buildVerificationEmailSubjectRateLimiterOptions().keyGenerator!;
    const { res } = buildResponse();

    // When
    const first = await keyGenerator(
      buildRequest('10.0.0.1', IDP_SUBJECT),
      res
    );
    const second = await keyGenerator(
      buildRequest('10.0.0.2', IDP_SUBJECT),
      res
    );

    // Then
    expect(first).toBe(second);
  });

  it.each([
    ['without a refused account in the session', undefined, true],
    ['with a refused account in the session', IDP_SUBJECT, false],
  ])(
    'should skip the limiter %s: %s',
    async (_description, idpSubject, expected) => {
      // Given
      const skip = buildVerificationEmailSubjectRateLimiterOptions().skip!;

      // When
      const skipped = await skip(
        buildRequest('10.0.0.1', idpSubject),
        buildResponse().res
      );

      // Then
      expect(skipped).toBe(expected);
    }
  );

  it.each([
    ['refused account', buildVerificationEmailSubjectRateLimiterOptions],
    ['IP', buildVerificationEmailIpRateLimiterOptions],
  ])(
    'should answer the error contract when the %s limit is reached',
    (_description, buildOptions) => {
      // Given
      const handler = buildOptions().handler!;
      const { res, status, json } = buildResponse();

      // When
      handler(buildRequest('10.0.0.1', IDP_SUBJECT), res, vi.fn(), {} as never);

      // Then
      expect(status).toHaveBeenCalledWith(429);
      expect(json).toHaveBeenCalledWith({ error: 'TOO_MANY_REQUESTS' });
    }
  );
});
