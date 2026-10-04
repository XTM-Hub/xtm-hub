import { describe, expect, it, vi } from 'vitest';
import { logApp } from '../../../../../utils/app-logger.util';
import { TooManyRequestsErrorCode } from '../../../../../utils/error/error.code';
import {
  COVERAGE_FACETS_ANONYMOUS_RATE_LIMIT,
  COVERAGE_FACETS_RATE_LIMIT,
  coverageFacetsCallerKey,
  createFixedWindowLimiter,
  IntegrationCoverageRateLimit,
} from './integration-coverage.rate-limit';

describe('integration-coverage.rate-limit', () => {
  it('should log one warning per refused caller, however many requests it sends', () => {
    // Given
    IntegrationCoverageRateLimit.reset();
    const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => {});
    const caller = { ip: '198.51.100.7' };
    for (let i = 0; i < COVERAGE_FACETS_RATE_LIMIT.limit; i += 1) {
      IntegrationCoverageRateLimit.assertFacetsAllowed(caller);
    }

    // When
    const refusals = Array.from(
      { length: 50 },
      () => () => IntegrationCoverageRateLimit.assertFacetsAllowed(caller)
    );

    // Then
    refusals.forEach((refuse) =>
      expect(refuse).toThrow(TooManyRequestsErrorCode.CoverageSearchRateLimited)
    );
    expect(warn).toHaveBeenCalledTimes(1);
    IntegrationCoverageRateLimit.reset();
    warn.mockRestore();
  });

  it('should refuse a key past its limit until its window ends', () => {
    // Given
    const limiter = createFixedWindowLimiter({
      windowMs: 1000,
      limit: 2,
      maxKeys: 10,
    });

    // When
    const results = [
      limiter.consume('a', 0),
      limiter.consume('a', 10),
      limiter.consume('a', 20),
      limiter.consume('b', 20),
      limiter.consume('a', 1000),
    ];

    // Then
    expect(results).toEqual([true, true, false, true, true]);
  });

  it('should bound the tracked keys, expired windows first', () => {
    // Given
    const limiter = createFixedWindowLimiter({
      windowMs: 1000,
      limit: 1,
      maxKeys: 2,
    });
    limiter.consume('expired', 0);
    limiter.consume('active', 900);

    // When
    limiter.consume('new', 1500);

    // Then: the active window is kept, the newest key is tracked
    expect(limiter.consume('active', 1600)).toBe(false);
    expect(limiter.consume('new', 1600)).toBe(false);
  });

  it('should drop the oldest window at capacity when none expired', () => {
    // Given
    const limiter = createFixedWindowLimiter({
      windowMs: 1000,
      limit: 1,
      maxKeys: 2,
    });
    limiter.consume('oldest', 0);
    limiter.consume('older', 100);

    // When
    limiter.consume('new', 200);

    // Then: the oldest key starts a fresh window, the others are still limited
    expect(limiter.consume('older', 300)).toBe(false);
    expect(limiter.consume('new', 300)).toBe(false);
    expect(limiter.consume('oldest', 300)).toBe(true);
  });

  it('should move a key starting a new window behind the others', () => {
    // Given
    const limiter = createFixedWindowLimiter({
      windowMs: 1000,
      limit: 1,
      maxKeys: 2,
    });
    limiter.consume('a', 0);
    limiter.consume('b', 500);
    // a starts a new window at 1200: b is now the oldest
    limiter.consume('a', 1200);

    // When
    limiter.consume('c', 1300);

    // Then
    expect(limiter.consume('a', 1400)).toBe(false);
    expect(limiter.consume('c', 1400)).toBe(false);
  });

  it('should bound the anonymous callers together, whatever addresses they use, and not the signed-in ones', () => {
    // Given
    IntegrationCoverageRateLimit.reset();
    const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => {});
    for (let i = 0; i < COVERAGE_FACETS_ANONYMOUS_RATE_LIMIT.limit; i += 1) {
      IntegrationCoverageRateLimit.assertFacetsAllowed({
        ip: `10.${Math.floor(i / 250)}.${i % 250}.1`,
      });
    }

    // When
    const newAddress = () =>
      IntegrationCoverageRateLimit.assertFacetsAllowed({ ip: '192.0.2.200' });

    // Then
    expect(newAddress).toThrow(
      TooManyRequestsErrorCode.CoverageSearchRateLimited
    );
    expect(() =>
      IntegrationCoverageRateLimit.assertFacetsAllowed({
        userId: 'user-id',
        ip: '192.0.2.200',
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      '[RATE-LIMIT] Coverage search with facets rate limited',
      expect.objectContaining({
        caller: 'anonymous',
        limit: COVERAGE_FACETS_ANONYMOUS_RATE_LIMIT.limit,
      })
    );
    IntegrationCoverageRateLimit.reset();
    warn.mockRestore();
  });

  it('should key a signed-in caller by user and an anonymous one by IP', () => {
    expect(
      coverageFacetsCallerKey({ userId: 'user-id', ip: '203.0.113.7' })
    ).toBe('user:user-id');
    expect(coverageFacetsCallerKey({ ip: '203.0.113.7' })).toBe(
      'ip:203.0.113.7'
    );
    expect(coverageFacetsCallerKey({})).toBe('ip:unknown');
  });
});
