import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../../utils/app-logger.util';
import {
  admitApiTokenLookup,
  API_TOKEN_FAILURE_RATE_MAX,
  countRefusedApiToken,
  createFailureCounter,
  createRecentApiTokens,
  RECENT_API_TOKEN_MAX,
  recentApiTokens,
  refundApiTokenLookup,
} from './api-token.failure-limit';

// Documentation addresses (RFC 5737), one per test: the counter lives as long as the module
const buildRequest = (ip: string) =>
  ({ ip, path: '/graphql-api', headers: {} }) as unknown as Request;

const buildResponse = () => {
  const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const admit = (ip: string) => {
  const res = buildResponse();
  const admitted = admitApiTokenLookup(
    buildRequest(ip),
    res as unknown as Response
  );
  return { res, admitted };
};

const admitMany = (ip: string, count: number) => {
  for (let index = 0; index < count; index++) {
    admit(ip);
  }
};

describe('failure counter', () => {
  const WINDOW_MS = 1000;
  const NOW = 1_700_000_000_000;

  it('should count the hits of a key within its window', () => {
    // Given
    const counter = createFailureCounter({ windowMs: WINDOW_MS });
    counter.hit('key-a', NOW);

    // When
    const result = counter.hit('key-a', NOW + WINDOW_MS - 1);

    // Then
    expect(result).toEqual({ hits: 2, resetAt: NOW + WINDOW_MS });
  });

  it('should start a new window once the previous one is over', () => {
    // Given
    const counter = createFailureCounter({ windowMs: WINDOW_MS });
    counter.hit('key-a', NOW);

    // When
    const result = counter.hit('key-a', NOW + WINDOW_MS);

    // Then
    expect(result).toEqual({ hits: 1, resetAt: NOW + 2 * WINDOW_MS });
  });

  it('should give back a hit of the current window only', () => {
    // Given
    const counter = createFailureCounter({ windowMs: WINDOW_MS });
    counter.hit('key-a', NOW);
    counter.hit('key-a', NOW);

    // When
    counter.refund('key-a', NOW);
    counter.refund('key-b', NOW);

    // Then
    expect(counter.hit('key-a', NOW).hits).toBe(2);
    expect(counter.size()).toBe(1);
  });

  it('should drop the windows that are over when a hit comes in', () => {
    // Given
    const counter = createFailureCounter({ windowMs: WINDOW_MS });
    counter.hit('key-a', NOW);
    counter.hit('key-b', NOW + 1);

    // When
    counter.hit('key-c', NOW + WINDOW_MS + 1);

    // Then
    expect(counter.size()).toBe(1);
  });
});

describe('api token failure rate limit', () => {
  beforeEach(() => {
    vi.spyOn(logApp, 'warn').mockImplementation(() => undefined);
  });

  it('should admit each lookup up to the limit', () => {
    // Given
    const ip = '198.51.100.40';
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX - 1);

    // When
    const { res, admitted } = admit(ip);

    // Then
    expect(admitted).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should answer 429 with a retry delay once a client has used up its lookups', () => {
    // Given
    const ip = '198.51.100.41';
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX);

    // When
    const { res, admitted } = admit(ip);

    // Then
    expect(admitted).toBe(false);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.stringMatching(/^\d+$/)
    );
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

  it('should log a client going over its limit once per window', () => {
    // Given
    const ip = '198.51.100.42';
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX);

    // When
    admitMany(ip, 3);

    // Then
    expect(logApp.warn).toHaveBeenCalledTimes(1);
  });

  it('should give back the hit of a lookup that was refunded', () => {
    // Given
    const ip = '198.51.100.43';
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX);
    refundApiTokenLookup(buildRequest(ip));

    // When
    const { admitted } = admit(ip);

    // Then
    expect(admitted).toBe(true);
  });

  it('should count a refusal made without a lookup hit', () => {
    // Given
    const ip = '198.51.100.44';
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX - 1);
    countRefusedApiToken(buildRequest(ip));

    // When
    const { admitted } = admit(ip);

    // Then
    expect(admitted).toBe(false);
  });

  it('should keep the allowance of a client while another one is over its limit', () => {
    // Given
    admitMany('198.51.100.45', API_TOKEN_FAILURE_RATE_MAX + 1);

    // When
    const { admitted } = admit('198.51.100.46');

    // Then
    expect(admitted).toBe(true);
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
