import { describe, expect, it } from 'vitest';
import { createKeyRateLimiter, isPrivateIp } from './rate-limit.util';

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
