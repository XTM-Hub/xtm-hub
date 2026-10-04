import { describe, expect, it } from 'vitest';
import {
  coverageFacetsCallerKey,
  createFixedWindowLimiter,
} from './integration-coverage.rate-limit';

describe('integration-coverage.rate-limit', () => {
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
