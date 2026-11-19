import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../../utils/app-logger.util';
import {
  API_TOKEN_FAILURE_RATE_MAX,
  countApiTokenFailure,
  createRecentApiTokens,
  isApiTokenFailureLimitReached,
  RECENT_API_TOKEN_MAX,
  recentApiTokens,
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

describe('recent api tokens', () => {
  const TTL_MS = 1000;
  const NOW = 1_700_000_000_000;
  const MAX = 3;

  it('should know a token until its time to live is over', () => {
    // Given
    const recent = createRecentApiTokens({ ttlMs: TTL_MS, max: MAX });
    recent.remember('hash-a', NOW);

    // Then
    expect(recent.has('hash-a', NOW + TTL_MS - 1)).toBe(true);
    expect(recent.has('hash-a', NOW + TTL_MS)).toBe(false);
    expect(recent.size()).toBe(0);
  });

  it('should forget a token on demand', () => {
    // Given
    const recent = createRecentApiTokens({ ttlMs: TTL_MS, max: MAX });
    recent.remember('hash-a', NOW);

    // When
    recent.forget('hash-a');

    // Then
    expect(recent.has('hash-a', NOW)).toBe(false);
  });

  it('should keep at most its maximum, dropping the oldest token first', () => {
    // Given
    const recent = createRecentApiTokens({ ttlMs: TTL_MS, max: MAX });
    ['hash-a', 'hash-b', 'hash-c'].forEach((hash, index) =>
      recent.remember(hash, NOW + index)
    );
    // hash-a used again: hash-b is now the oldest
    recent.remember('hash-a', NOW + 3);

    // When
    recent.remember('hash-d', NOW + 4);

    // Then
    expect(recent.size()).toBe(MAX);
    expect(
      ['hash-a', 'hash-b', 'hash-c', 'hash-d'].map((hash) =>
        recent.has(hash, NOW + 5)
      )
    ).toEqual([true, false, true, true]);
  });

  it('should drop the expired tokens when a new one comes in', () => {
    // Given
    const recent = createRecentApiTokens({ ttlMs: TTL_MS, max: MAX });
    recent.remember('hash-a', NOW);
    recent.remember('hash-b', NOW + 1);

    // When
    recent.remember('hash-c', NOW + TTL_MS + 1);

    // Then
    expect(recent.size()).toBe(1);
    expect(recent.has('hash-c', NOW + TTL_MS + 1)).toBe(true);
  });

  it('should bound the shared set of the module', () => {
    // When
    for (let index = 0; index <= RECENT_API_TOKEN_MAX; index++) {
      recentApiTokens.remember(`bounded-${index}`, NOW);
    }

    // Then
    expect(recentApiTokens.size()).toBe(RECENT_API_TOKEN_MAX);
    expect(recentApiTokens.has('bounded-0', NOW)).toBe(false);
    expect(recentApiTokens.has(`bounded-${RECENT_API_TOKEN_MAX}`, NOW)).toBe(
      true
    );
    // Leave the shared set empty for the other suites
    for (let index = 0; index <= RECENT_API_TOKEN_MAX; index++) {
      recentApiTokens.forget(`bounded-${index}`);
    }
  });
});
