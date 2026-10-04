import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  PulseObjectType,
  PulsePeriod,
} from '../../../__generated__/resolvers-types';
import { PulseApp } from '../pulse.app';
import { PulseConfig } from '../pulse.config';
import { PulseDay } from '../pulse.day.helper';
import { PulseDomain } from '../pulse.domain';
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

type SnapshotSave = 'saveTrendingSnapshot' | 'saveDigestSnapshot';

// Holds the next snapshot save until `release()`: the computation has read the
// data, its result is not saved yet.
const pauseNextSave = (method: SnapshotSave) => {
  let markReached = (): void => undefined;
  let release = (): void => undefined;
  const reached = new Promise<void>((resolve) => {
    markReached = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const domain = PulseDomain as unknown as Record<
    SnapshotSave,
    (snapshot: unknown) => Promise<void>
  >;
  const save = domain[method];
  vi.spyOn(domain, method).mockImplementationOnce(async (snapshot) => {
    markReached();
    await released;
    return save(snapshot);
  });
  return { reached, release: () => release() };
};

type PausableRead =
  | 'upsertPlatformDailyTotals'
  | 'loadSeenRanges'
  | 'loadBenchmarkTopItems'
  | 'loadTrendingSnapshot';

// Holds the next call of a domain function until `release()`: what ran before
// it is read or written, what follows is not.
const pauseNextCall = (method: PausableRead) => {
  let markReached = (): void => undefined;
  let release = (): void => undefined;
  const reached = new Promise<void>((resolve) => {
    markReached = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const domain = PulseDomain as unknown as Record<
    PausableRead,
    (input: unknown) => Promise<unknown>
  >;
  const original = domain[method];
  vi.spyOn(domain, method).mockImplementationOnce(async (input) => {
    markReached();
    await released;
    return original(input);
  });
  return { reached, release: () => release() };
};

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

    it('should never publish a trending ranking computed across a purge', async () => {
      // Given a ranking computed while five platforms reported LockBit, not saved yet
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const request = { day: PULSE_TEST_TODAY, period: PulsePeriod.Last_7Days };
      const pause = pauseNextSave('saveTrendingSnapshot');
      const inFlight = clients[1]!.trending(request);
      await pause.reached;

      // When one of them purges its contributions before the ranking is saved
      await clients[0]!.purge();
      pause.release();
      const during = await inFlight;
      const after = await clients[1]!.trending(request);

      // Then the ranking computed with five platforms is served neither to the
      // request in flight nor afterwards
      expect({
        during: during.items.length,
        after: after.items.length,
      }).toEqual({ during: 0, after: 0 });
    });

    it('should never publish a digest computed across a purge', async () => {
      // Given a digest computed while five platforms reported LockBit, not saved yet
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const pause = pauseNextSave('saveDigestSnapshot');
      const inFlight = clients[1]!.digest({ day: PULSE_TEST_TODAY });
      await pause.reached;

      // When one of them purges its contributions before the digest is saved
      await clients[0]!.purge();
      pause.release();
      const during = await inFlight;
      const saved = await PulseDomain.loadDigestSnapshot(PULSE_TEST_TODAY);
      const after = await clients[1]!.digest({ day: PULSE_TEST_TODAY });

      // Then the digest computed with five platforms is neither saved nor
      // served, not even to the request in flight, which gets the digest
      // computed again after the purge
      expect({
        during: during.items.length,
        saved: saved?.stored?.items,
        after: after.items.length,
      }).toEqual({ during: 0, saved: [], after: 0 });
    });

    it('should never answer a digest whose items and trending section were read across a purge', async () => {
      // Given five platforms reporting LockBit and a digest paused once its
      // items are read, before its trending section
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const pause = pauseNextCall('loadTrendingSnapshot');
      const inFlight = clients[1]!.digest({ day: PULSE_TEST_TODAY });
      await pause.reached;

      // When one of them purges before the trending section is read
      await clients[0]!.purge();
      pause.release();
      const digest = await inFlight;

      // Then both parts are read again after the purge: four platforms stay below k
      expect({
        items: digest.items.length,
        trending: digest.trending.items.length,
        locked: digest.trending.locked_count,
      }).toEqual({ items: 0, trending: 0, locked: 0 });
    });

    it('should record nothing for a batch accepted before a purge and retried after it', async () => {
      // Given a batch accepted, then a purge whose answer the platform never received
      const [client] = await registerPulseClients(1);
      const batchId = randomUUID();
      await client!.push({
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
        batchId,
      });
      await client!.purge();

      // When the platform sends the batch again
      const retry = await client!.push({
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
        batchId,
      });

      // Then the purged contribution does not come back
      expect({
        retry,
        contributions: await TestHelper.pulse.countRows('PulseContribution'),
        platforms: await TestHelper.pulse.countRows('PulsePlatform'),
      }).toEqual({
        retry: { accepted: 0, day: PULSE_TEST_TODAY },
        contributions: 0,
        platforms: 0,
      });
    });

    it('should move the data generation with the first day a stopped purge deleted', async () => {
      // Given a platform that contributed on two days
      const [client] = await registerPulseClients(1);
      clock.addDays(-1);
      await client!.push({ day: clock.today(), records: [malware(LOCKBIT)] });
      clock.addDays(1);
      await client!.push({
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const before = await PulseDomain.loadDataGeneration();
      const purgeDay = PulseDomain.purgeContributionDay;
      let calls = 0;
      vi.spyOn(PulseDomain, 'purgeContributionDay').mockImplementation(
        async (input) => {
          calls += 1;
          if (calls > 1) {
            throw new Error('Purge stopped');
          }
          return purgeDay(input);
        }
      );

      // When the purge stops after deleting its first day
      const result = await client!.purgeResult();

      // Then the deletion committed with its daily totals and a new generation: neither the benchmark medians nor a
      // snapshot computed before it count the deleted day
      expect({
        failed: errorCodes(result).length > 0,
        contributions: await TestHelper.pulse.countRows('PulseContribution'),
        totals: await TestHelper.pulse.countRows('PulsePlatformDailyTotal'),
        generationMoved: (await PulseDomain.loadDataGeneration()) > before,
      }).toEqual({
        failed: true,
        contributions: 1,
        totals: 1,
        generationMoved: true,
      });
    });

    it('should purge a first contribution still being written when the purge starts', async () => {
      // Given a first push paused inside its transaction, under the platform lock
      const [client] = await registerPulseClients(1);
      const pause = pauseNextCall('upsertPlatformDailyTotals');
      const pushing = client!.push({
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      await pause.reached;

      // When the purge starts before that push commits and blocks on the
      // platform lock the push holds
      const purging = client!.purge();
      try {
        await TestHelper.pulse.waitForBlockedAdvisoryLock();
      } finally {
        pause.release();
      }
      await pushing;
      const result = await purging;

      // Then the purge waited for the contribution and removed it
      expect({
        deleted: result.deleted_records,
        contributions: await TestHelper.pulse.countRows('PulseContribution'),
        platforms: await TestHelper.pulse.countRows('PulsePlatform'),
      }).toEqual({ deleted: 1, contributions: 0, platforms: 0 });
    });

    it('should never answer a lookup read across a purge', async () => {
      // Given five platforms reporting LockBit and a lookup paused once it counted them
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const pause = pauseNextCall('loadSeenRanges');
      const inFlight = clients[1]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });
      await pause.reached;

      // When one of them purges before the lookup reads the rest
      await clients[0]!.purge();
      pause.release();
      const [result] = await inFlight;

      // Then the lookup is read again after the purge: four platforms stay below k
      expect(result?.published).toBe(false);
    });

    it('should never answer a benchmark read across a purge', async () => {
      // Given five platforms of one sector and a benchmark paused once it read the totals
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const pause = pauseNextCall('loadBenchmarkTopItems');
      const inFlight = clients[1]!.benchmark({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
      });
      await pause.reached;

      // When one of them purges before the benchmark reads its top items
      await clients[0]!.purge();
      pause.release();
      const result = await inFlight;

      // Then the medians come from the platforms left: four, below k
      expect(result.sector_platforms_bucket).toBeNull();
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
      clock.setTime('2027-10-28T10:00:00.000Z');
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

    it('should never save a snapshot computed before a retention run', async () => {
      // Given a digest computed before a retention run, not saved yet
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const pause = pauseNextSave('saveDigestSnapshot');
      const inFlight = clients[1]!.digest({ day: PULSE_TEST_TODAY });
      await pause.reached;
      const before = await PulseDomain.loadDataGeneration();

      // When the retention run ends before the digest is saved
      await PulseApp.applyRetention(clock.now());
      pause.release();
      await inFlight;

      // Then the digest computed before the run is not the one saved: the
      // request in flight computed it again under the new generation
      const current = await PulseDomain.loadDataGeneration();
      const saved = await PulseDomain.loadDigestSnapshot(PULSE_TEST_TODAY);
      expect({
        moved: current > before,
        savedUnder: saved?.stored?.generation,
      }).toEqual({ moved: true, savedUnder: current });
    });

    it('should move the data generation with the first batch a stopped retention run deleted', async () => {
      // Given contributions past the retention period
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: RETENTION_DAY,
        records: [malware(LOCKBIT)],
      });
      const before = await PulseDomain.loadDataGeneration();
      const deleteRows = PulseDomain.deleteRowsBeforeDay;
      let calls = 0;
      vi.spyOn(PulseDomain, 'deleteRowsBeforeDay').mockImplementation(
        async (input) => {
          calls += 1;
          if (calls > 1) {
            throw new Error('Retention stopped');
          }
          return deleteRows(input);
        }
      );

      // When the run stops after its first deletion batch
      await expect(
        PulseApp.applyRetention(new Date('2027-11-04T02:00:00.000Z'))
      ).rejects.toThrow('Retention stopped');

      // Then the deletion committed with a new generation
      expect({
        contributions: await TestHelper.pulse.countRows('PulseContribution'),
        generationMoved: (await PulseDomain.loadDataGeneration()) > before,
      }).toEqual({ contributions: 0, generationMoved: true });
    });
  });

  describe('cleanExpiredSalts', () => {
    it('should keep the salts of the current and the two previous days only', async () => {
      // Given
      for (const daysAgo of [5, 4, 3, 2, 1]) {
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
      expect(days.filter((day) => day.startsWith('2027-03'))).toEqual([
        '2027-03-08',
        '2027-03-09',
        '2027-03-10',
      ]);
    });

    it('should delete the batch receipts with the salt of their day', async () => {
      // Given
      const [client] = await registerPulseClients(1);
      await client!.push({
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const pushed = await TestHelper.pulse.countRows('PulseBatch');

      // When
      await PulseApp.cleanExpiredSalts(
        new Date(`${PulseDay.addDays(PULSE_TEST_TODAY, 2)}T00:05:00.000Z`)
      );
      const kept = await TestHelper.pulse.countRows('PulseBatch');
      await PulseApp.cleanExpiredSalts(
        new Date(`${PulseDay.addDays(PULSE_TEST_TODAY, 3)}T00:05:00.000Z`)
      );

      // Then
      expect({
        pushed,
        kept,
        deleted: await TestHelper.pulse.countRows('PulseBatch'),
      }).toEqual({ pushed: 1, kept: 1, deleted: 0 });
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
