import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../../utils/app-logger.util';
import {
  admitApiTokenLookup,
  API_TOKEN_FAILURE_RATE_MAX,
  countRefusedApiToken,
  createFailureCounter,
  createRecentApiTokens,
  type LookupReservation,
  RECENT_API_TOKEN_MAX,
  recentApiTokens,
  releaseApiTokenLookup,
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
  const reservation = admitApiTokenLookup(
    buildRequest(ip),
    res as unknown as Response
  );
  return { res, reservation };
};

const admitMany = (ip: string, count: number): LookupReservation[] =>
  Array.from({ length: count }, () => admit(ip).reservation).filter(
    (reservation) => reservation !== undefined
  );

describe('failure counter', () => {
  const WINDOW_MS = 1000;
  const MAX = 2;
  const NOW = 1_700_000_000_000;

  const buildCounter = () =>
    createFailureCounter({ windowMs: WINDOW_MS, max: MAX });

  it('should admit a key up to its maximum within its window', () => {
    // Given
    const counter = buildCounter();
    counter.reserve('key-a', NOW);
    counter.reserve('key-a', NOW + 1);

    // When
    const result = counter.reserve('key-a', NOW + WINDOW_MS - 1);

    // Then
    expect(result).toEqual({
      admitted: false,
      resetAt: NOW + WINDOW_MS,
      firstRejection: true,
    });
  });

  it('should flag only the first rejection of a window', () => {
    // Given
    const counter = buildCounter();
    counter.count('key-a', NOW);
    counter.count('key-a', NOW);
    counter.reserve('key-a', NOW);

    // When
    const result = counter.reserve('key-a', NOW);

    // Then
    expect(result).toMatchObject({ admitted: false, firstRejection: false });
  });

  it('should take no hit for a rejected request', () => {
    // Given
    const counter = buildCounter();
    const reservations = [
      counter.reserve('key-a', NOW),
      counter.reserve('key-a', NOW),
    ];
    counter.reserve('key-a', NOW);
    counter.reserve('key-a', NOW);

    // When
    reservations.forEach((result) => {
      if (result.admitted) {
        counter.release(result.reservation);
      }
    });

    // Then
    expect(counter.reserve('key-a', NOW).admitted).toBe(true);
    expect(counter.reserve('key-a', NOW).admitted).toBe(true);
  });

  it('should start a new window once the previous one is over', () => {
    // Given
    const counter = buildCounter();
    counter.count('key-a', NOW);
    counter.count('key-a', NOW);

    // When
    const result = counter.reserve('key-a', NOW + WINDOW_MS);

    // Then
    expect(result).toEqual({
      admitted: true,
      reservation: { key: 'key-a', resetAt: NOW + 2 * WINDOW_MS },
    });
  });

  it('should give back a reservation only to the window that took it', () => {
    // Given
    const counter = buildCounter();
    const previous = counter.reserve('key-a', NOW);
    counter.count('key-a', NOW + WINDOW_MS);
    counter.count('key-a', NOW + WINDOW_MS);

    // When
    if (previous.admitted) {
      counter.release(previous.reservation);
    }

    // Then
    expect(counter.reserve('key-a', NOW + WINDOW_MS).admitted).toBe(false);
  });

  it('should drop the windows that are over when a hit comes in', () => {
    // Given
    const counter = buildCounter();
    counter.count('key-a', NOW);
    counter.count('key-b', NOW + 1);

    // When
    counter.count('key-c', NOW + WINDOW_MS + 1);

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
    const { res, reservation } = admit(ip);

    // Then
    expect(reservation).toBeDefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should answer 429 with a retry delay once a client has used up its lookups', () => {
    // Given
    const ip = '198.51.100.41';
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX);

    // When
    const { res, reservation } = admit(ip);

    // Then
    expect(reservation).toBeUndefined();
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

  it('should give back the hit of a lookup that was released', () => {
    // Given
    const ip = '198.51.100.43';
    const [first] = admitMany(ip, API_TOKEN_FAILURE_RATE_MAX);
    releaseApiTokenLookup(first);

    // When
    const { reservation } = admit(ip);

    // Then
    expect(reservation).toBeDefined();
  });

  it('should not count the requests answered 429 once the lookups are released', () => {
    // Given
    const ip = '198.51.100.47';
    const reservations = admitMany(ip, API_TOKEN_FAILURE_RATE_MAX);
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX);

    // When
    reservations.forEach(releaseApiTokenLookup);

    // Then
    expect(admitMany(ip, API_TOKEN_FAILURE_RATE_MAX)).toHaveLength(
      API_TOKEN_FAILURE_RATE_MAX
    );
  });

  it('should count a refusal made without a reservation', () => {
    // Given
    const ip = '198.51.100.44';
    admitMany(ip, API_TOKEN_FAILURE_RATE_MAX - 1);
    countRefusedApiToken(buildRequest(ip));

    // When
    const { reservation } = admit(ip);

    // Then
    expect(reservation).toBeUndefined();
  });

  it('should keep the allowance of a client while another one is over its limit', () => {
    // Given
    admitMany('198.51.100.45', API_TOKEN_FAILURE_RATE_MAX + 1);

    // When
    const { reservation } = admit('198.51.100.46');

    // Then
    expect(reservation).toBeDefined();
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
