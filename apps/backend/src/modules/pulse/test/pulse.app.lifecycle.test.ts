import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  PulseObjectType,
  PulsePeriod,
} from '../../../__generated__/resolvers-types';
import { PulseApp } from '../pulse.app';
import { PulseConfig } from '../pulse.config';
import { PulseDay } from '../pulse.day.helper';
import { PulseErrorCode } from '../pulse.errors';
import {
  cleanPulseState,
  errorCodes,
  PULSE_INTEGRATION_SUITE,
  PULSE_TEST_TODAY,
  pushFromEach,
  registerPulseClients,
  usePulseClock,
} from './pulse.test.utils';

const LOCKBIT = 'lockbit';
const MALWARE = PulseObjectType.Malware;
const RETENTION_DAY = '2026-10-03';
const SALT_A = '000102030405060708090a0b0c0d0e0f';

const malware = (value: string) => ({ objectType: MALWARE, value });

describe('pulseApp lifecycle', PULSE_INTEGRATION_SUITE, () => {
  let clock: ReturnType<typeof usePulseClock>;

  beforeEach(() => {
    clock = usePulseClock();
  });

  afterEach(async () => {
    await cleanPulseState();
  });

  describe('pulsePurge', () => {
    it('should answer FORBIDDEN when platformId is not the calling platform', async () => {
      // Given
      const [caller, other] = await registerPulseClients(2);

      // When
      const result = await caller!.purgeResult(other!.platform.platformId);

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.Forbidden]);
    });

    it('should succeed without deleting anything for a platform that never contributed', async () => {
      // Given
      const [client] = await registerPulseClients(1);

      // When
      const result = await client!.purge();

      // Then
      expect(result).toEqual({ success: true, deleted_records: 0 });
    });

    it('should delete every contribution of the platform and recompute the aggregates', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT), malware('emotet')],
      });
      clock.addDays(-1);
      await clients[0]!.push({
        day: clock.today(),
        records: [malware(LOCKBIT)],
      });
      clock.addDays(1);

      // When
      const result = await clients[0]!.purge();

      // Then
      expect({
        result,
        contributions: await TestHelper.pulse.countRows('PulseContribution'),
        platforms: await TestHelper.pulse.countRows('PulsePlatform'),
        keyPlatformCounts: await TestHelper.pulse.loadKeyPlatformCounts(),
        aggregates: (await TestHelper.pulse.loadDailyAggregates()).map(
          ({ day, platform_count }) => ({ day, platform_count })
        ),
      }).toEqual({
        result: { success: true, deleted_records: 3 },
        contributions: 8,
        platforms: 4,
        keyPlatformCounts: [4, 4],
        aggregates: [
          { day: PULSE_TEST_TODAY, platform_count: 4 },
          { day: PULSE_TEST_TODAY, platform_count: 4 },
        ],
      });
    });

    it('should unpublish a key that falls below k after a purge', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const lookup = () =>
        clients[1]!.lookup({
          day: PULSE_TEST_TODAY,
          objectType: MALWARE,
          values: [LOCKBIT],
        });
      const [before] = await lookup();

      // When
      await clients[0]!.purge();
      const [after] = await lookup();

      // Then
      expect({
        before: before?.published,
        after: after?.published,
      }).toEqual({ before: true, after: false });
    });

    it('should drop the cached trending ranking', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const request = { day: PULSE_TEST_TODAY, period: PulsePeriod.Last_7Days };
      const before = await clients[1]!.trending(request);

      // When
      await clients[0]!.purge();
      const after = await clients[1]!.trending(request);

      // Then
      expect({
        before: before.items.length,
        after: after.items.length,
      }).toEqual({ before: 1, after: 0 });
    });

    it('should limit purges to 5 per 24 hours', async () => {
      // Given
      const [client] = await registerPulseClients(1);
      for (let index = 0; index < 5; index++) {
        await client!.purge();
      }

      // When
      const result = await client!.purgeResult();

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.RateLimited]);
    });
  });

  describe('applyRetention', () => {
    it('should delete contributions older than the retention period', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: RETENTION_DAY,
        records: [malware(LOCKBIT)],
      });

      // When 13 months and 1 day later
      await PulseApp.applyRetention(new Date('2027-11-04T02:00:00.000Z'));

      // Then
      expect({
        contributions: await TestHelper.pulse.countRows('PulseContribution'),
        aggregates: await TestHelper.pulse.countRows('PulseDailyAggregate'),
        totals: await TestHelper.pulse.countRows('PulsePlatformDailyTotal'),
        contributors: await TestHelper.pulse.countRows('PulseKeyContributor'),
        keys: await TestHelper.pulse.countRows('PulseKey'),
        platforms: await TestHelper.pulse.countRows('PulsePlatform'),
      }).toEqual({
        contributions: 0,
        aggregates: 0,
        totals: 0,
        contributors: 0,
        keys: 0,
        platforms: 0,
      });
    });

    it('should still delete expired contributions when an unrelated setting disables the service', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: RETENTION_DAY,
        records: [malware(LOCKBIT)],
      });
      vi.spyOn(PulseConfig, 'get').mockReturnValue({
        enabled: false,
        reason:
          'pulse.rate_limits.push_pulse must be an integer between 1 and 1000000',
        severity: 'error',
        settings: null,
        retentionMonths: 13,
      });

      // When 13 months and 1 day later
      await PulseApp.applyRetention(new Date('2027-11-04T02:00:00.000Z'));

      // Then
      expect(await TestHelper.pulse.countRows('PulseContribution')).toBe(0);
    });

    it('should keep contributions inside the retention period', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: RETENTION_DAY,
        records: [malware(LOCKBIT)],
      });

      // When exactly 13 months later
      await PulseApp.applyRetention(new Date('2027-11-03T02:00:00.000Z'));

      // Then
      expect({
        contributions: await TestHelper.pulse.countRows('PulseContribution'),
        keyPlatformCounts: await TestHelper.pulse.loadKeyPlatformCounts(),
      }).toEqual({ contributions: 5, keyPlatformCounts: [5] });
    });

    it('should unpublish keys whose contributors all left the retention period', async () => {
      // Given 4 platforms long ago and 1 platform recently
      const clients = await registerPulseClients(5);
      await pushFromEach(clients.slice(0, 4), {
        day: RETENTION_DAY,
        records: [malware(LOCKBIT)],
      });
      clock.setTime('2027-10-20T10:00:00.000Z');
      await clients[4]!.push({
        day: clock.today(),
        records: [malware(LOCKBIT)],
      });
      clock.setTime('2027-11-04T10:00:00.000Z');
      await PulseApp.applyRetention(clock.now());

      // When
      const [result] = await clients[4]!.lookup({
        day: clock.today(),
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then
      expect({
        published: result?.published,
        keyPlatformCounts: await TestHelper.pulse.loadKeyPlatformCounts(),
        platforms: await TestHelper.pulse.countRows('PulsePlatform'),
      }).toEqual({ published: false, keyPlatformCounts: [1], platforms: 1 });
    });
  });

  describe('cleanExpiredSalts', () => {
    it('should delete the salts older than 3 days and keep the recent ones', async () => {
      // Given
      for (const daysAgo of [5, 4, 3]) {
        await TestHelper.pulse.insertSalt(
          PulseDay.addDays('2027-03-10', -daysAgo),
          SALT_A
        );
      }
      await TestHelper.pulse.insertSalt('2027-03-10', SALT_A);

      // When
      await PulseApp.cleanExpiredSalts(new Date('2027-03-10T00:05:00.000Z'));

      // Then
      const days = await TestHelper.pulse.loadSaltDays();
      expect({
        expired: days.filter((day) => day < '2027-03-07'),
        march: days.filter((day) => day.startsWith('2027-03')),
      }).toEqual({ expired: [], march: ['2027-03-07', '2027-03-10'] });
    });
  });

  describe('cleanRateLimitBuckets', () => {
    it.each([
      { hoursLater: 1, expected: 1 },
      { hoursLater: 25, expected: 0 },
    ])(
      'should keep $expected rate limit bucket $hoursLater hours later',
      async ({ hoursLater, expected }) => {
        // Given
        const [client] = await registerPulseClients(1);
        await client!.status();

        // When
        await PulseApp.cleanRateLimitBuckets(
          new Date(clock.now().getTime() + hoursLater * 60 * 60 * 1000)
        );

        // Then
        expect(await TestHelper.pulse.countRows('PulseRateLimit')).toBe(
          expected
        );
      }
    );
  });
});
