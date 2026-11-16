import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { PlatformAssertionDomain } from './platform-assertion.domain';

const EXPIRED_AT = new Date('2020-01-01T00:00:00Z');
const NOT_EXPIRED_AT = new Date('2100-01-01T00:00:00Z');

describe('platformAssertionDomain', () => {
  const createdJtis: string[] = [];
  const newJti = () => {
    const jti = uuidv4();
    createdJtis.push(jti);
    return jti;
  };

  afterEach(async () => {
    await TestHelper.platformAssertionJti.deleteAll(createdJtis);
    createdJtis.length = 0;
  });

  describe('consumeJti', () => {
    it('should accept an assertion id when it was never seen', async () => {
      // Given
      const jti = newJti();

      // When
      const consumed = await PlatformAssertionDomain.consumeJti({
        jti,
        expiresAt: NOT_EXPIRED_AT,
      });

      // Then
      expect(consumed).toBe(true);
    });

    it('should refuse an assertion id when it was already consumed', async () => {
      // Given
      const jti = newJti();
      await PlatformAssertionDomain.consumeJti({
        jti,
        expiresAt: NOT_EXPIRED_AT,
      });

      // When
      const consumed = await PlatformAssertionDomain.consumeJti({
        jti,
        expiresAt: NOT_EXPIRED_AT,
      });

      // Then
      expect(consumed).toBe(false);
    });

    it('should accept only one of two concurrent replays of the same assertion id', async () => {
      // Given
      const jti = newJti();

      // When
      const results = await Promise.all([
        PlatformAssertionDomain.consumeJti({ jti, expiresAt: NOT_EXPIRED_AT }),
        PlatformAssertionDomain.consumeJti({ jti, expiresAt: NOT_EXPIRED_AT }),
      ]);

      // Then
      expect(results.toSorted()).toEqual([false, true]);
    });
  });

  describe('deleteExpiredJtis', () => {
    it('should delete only the assertion ids that expired', async () => {
      // Given
      const expiredJti = newJti();
      const liveJti = newJti();
      await TestHelper.platformAssertionJti.create({
        jti: expiredJti,
        expires_at: EXPIRED_AT,
      });
      await TestHelper.platformAssertionJti.create({
        jti: liveJti,
        expires_at: NOT_EXPIRED_AT,
      });

      // When
      await PlatformAssertionDomain.deleteExpiredJtis();

      // Then
      const remaining = await TestHelper.platformAssertionJti.loadAll([
        expiredJti,
        liveJti,
      ]);
      expect(remaining.map(({ jti }) => jti)).toEqual([liveJti]);
    });
  });
});
