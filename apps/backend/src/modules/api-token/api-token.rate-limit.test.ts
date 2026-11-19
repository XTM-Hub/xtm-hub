import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../../utils/app-logger.util';
import {
  API_TOKEN_FAILURE_RATE_MAX,
  countApiTokenFailure,
  isApiTokenFailureLimitReached,
} from './api-token.rate-limit';

// Documentation addresses (RFC 5737), one per test: the store lives as long as the module
const buildRequest = (ip: string) =>
  ({ ip, path: '/graphql-api', headers: {} }) as unknown as Request;

const buildResponse = () => {
  const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const refuse = async (ip: string) => {
  const res = buildResponse();
  const sendRefusal = vi.fn();
  const next = vi.fn();
  await countApiTokenFailure(
    buildRequest(ip),
    res as unknown as Response,
    sendRefusal,
    next
  );
  return { res, sendRefusal, next };
};

const refuseMany = async (ip: string, count: number) => {
  for (let index = 0; index < count; index++) {
    await refuse(ip);
  }
};

describe('api token failure rate limit', () => {
  beforeEach(() => {
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
  });

  it('should send the refusal of each failure up to the limit', async () => {
    // Given
    const ip = '198.51.100.40';
    await refuseMany(ip, API_TOKEN_FAILURE_RATE_MAX - 1);

    // When
    const reachedBefore = await isApiTokenFailureLimitReached(buildRequest(ip));
    const { res, sendRefusal, next } = await refuse(ip);

    // Then
    expect(reachedBefore).toBe(false);
    expect(sendRefusal).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should answer 429 once a client has used up its failures', async () => {
    // Given
    const ip = '198.51.100.41';
    await refuseMany(ip, API_TOKEN_FAILURE_RATE_MAX);

    // When
    const reached = await isApiTokenFailureLimitReached(buildRequest(ip));
    const { res, sendRefusal } = await refuse(ip);

    // Then
    expect(reached).toBe(true);
    expect(sendRefusal).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      errors: [
        {
          message: 'TOO_MANY_REQUESTS',
          extensions: { code: 'TOO_MANY_REQUESTS' },
        },
      ],
    });
  });

  it('should keep the budget of a client while another one is over its limit', async () => {
    // Given
    await refuseMany('198.51.100.42', API_TOKEN_FAILURE_RATE_MAX + 1);

    // When
    const reached = await isApiTokenFailureLimitReached(
      buildRequest('198.51.100.43')
    );

    // Then
    expect(reached).toBe(false);
  });
});
