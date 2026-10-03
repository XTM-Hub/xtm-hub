import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PulseContributionStatus,
  PulseObjectType,
  PulsePeriod,
  PulsePrevalenceBucket,
  PulseSectorBucket,
  PulseTrendDirection,
} from '../../../__generated__/resolvers-types';
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

const MALWARE = PulseObjectType.Malware;

const malware = (value: string) => ({ objectType: MALWARE, value, count: 1 });

describe(
  'pulseApp preview digest and reciprocity',
  PULSE_INTEGRATION_SUITE,
  () => {
    let clock: ReturnType<typeof usePulseClock>;

    beforeEach(() => {
      clock = usePulseClock();
    });

    afterEach(async () => {
      await cleanPulseState();
    });

    describe('pulseDigest', () => {
      it('should give a platform that never contributed the published keys, matchable with its own hashes', async () => {
        // Given five contributors and a platform that never contributed
        const [viewer, ...contributors] = await registerPulseClients(6);
        await pushFromEach(contributors, {
          day: PULSE_TEST_TODAY,
          records: [malware('lockbit')],
        });
        await pushFromEach(contributors.slice(0, 4), {
          day: PULSE_TEST_TODAY,
          records: [malware('below-k')],
        });

        // When
        const digest = await viewer!.digest({ day: PULSE_TEST_TODAY });

        // Then the viewer finds LockBit with the hash it computes locally, and nothing below k
        const lockbit = await viewer!.hash(
          PULSE_TEST_TODAY,
          MALWARE,
          'lockbit'
        );
        const belowK = await viewer!.hash(PULSE_TEST_TODAY, MALWARE, 'below-k');
        expect(digest.items).toEqual([
          {
            hash: lockbit,
            object_type: MALWARE,
            prevalence_bucket: PulsePrevalenceBucket.Widespread,
            trend: PulseTrendDirection.Rising,
          },
        ]);
        expect(digest.items.map(({ hash }) => hash)).not.toContain(belowK);
        expect(digest).toMatchObject({
          day: PULSE_TEST_TODAY,
          sector_bucket: PulseSectorBucket.Finance,
          region_bucket: null,
        });
      });

      it('should name the first three trending ranks and only count the next ones', async () => {
        // Given five contributors reporting twelve families today
        const clients = await registerPulseClients(5);
        const families = Array.from({ length: 12 }, (_, i) => `family-${i}`);
        await pushFromEach(clients, {
          day: PULSE_TEST_TODAY,
          records: families.map(malware),
        });

        // When
        const { trending } = await clients[0]!.digest({
          day: PULSE_TEST_TODAY,
        });

        // Then
        expect(trending.period).toBe(PulsePeriod.Last_7Days);
        expect(trending.items.map(({ rank }) => rank)).toEqual([1, 2, 3]);
        expect(trending.locked_count).toBe(7);
        const hashes = await Promise.all(
          families.map((family) =>
            clients[0]!.hash(PULSE_TEST_TODAY, MALWARE, family)
          )
        );
        trending.items.forEach((item) => {
          expect(hashes).toContain(item.hash);
          expect(item.trend).toBe(PulseTrendDirection.Rising);
        });
      });

      it('should keep the digest within PULSE_DIGEST_SIZE, most prevalent keys first', async () => {
        // Given a digest of 100 keys at most and 101 published keys
        const config = PulseConfig.get();
        if (!config.enabled) {
          throw new Error('Threat Pulse must be enabled in tests');
        }
        vi.spyOn(PulseConfig, 'get').mockReturnValue({
          ...config,
          settings: { ...config.settings, digestSize: 100 },
        });
        const clients = await registerPulseClients(6);
        const families = Array.from({ length: 100 }, (_, i) => `family-${i}`);
        await pushFromEach(clients.slice(0, 5), {
          day: PULSE_TEST_TODAY,
          records: families.map(malware),
        });
        await pushFromEach(clients, {
          day: PULSE_TEST_TODAY,
          records: [malware('six-reporters')],
        });

        // When
        const digest = await clients[0]!.digest({ day: PULSE_TEST_TODAY });

        // Then
        expect(digest.items).toHaveLength(100);
        expect(digest.items[0]?.hash).toBe(
          await clients[0]!.hash(PULSE_TEST_TODAY, MALWARE, 'six-reporters')
        );
      });

      it('should forget a purged platform at once', async () => {
        // Given a digest computed while five platforms reported LockBit
        const clients = await registerPulseClients(5);
        await pushFromEach(clients, {
          day: PULSE_TEST_TODAY,
          records: [malware('lockbit')],
        });
        expect(
          (await clients[0]!.digest({ day: PULSE_TEST_TODAY })).items
        ).toHaveLength(1);

        // When one of them purges its contributions
        await clients[4]!.purge();

        // Then the cached digest is not served any more
        expect(await PulseDomain.loadDigestSnapshot(PULSE_TEST_TODAY)).toBe(
          undefined
        );
        expect(
          (await clients[0]!.digest({ day: PULSE_TEST_TODAY })).items
        ).toEqual([]);
      });

      it('should reject an unknown sector bucket', async () => {
        const [client] = await registerPulseClients(1);
        const result = await client!.digestResult({
          day: PULSE_TEST_TODAY,
          sector: 'not_a_sector' as PulseSectorBucket,
        });
        expect(errorCodes(result)).toEqual(['BAD_USER_INPUT']);
      });
    });

    describe('reciprocity', () => {
      it('should keep a platform that never contributed to the salt and the digest', async () => {
        // Given
        const [viewer] = await registerPulseClients(1);

        // When
        const lookup = await viewer!.lookupResult({
          day: PULSE_TEST_TODAY,
          objectType: MALWARE,
          values: ['lockbit'],
        });
        const trending = await viewer!.trendingResult({
          day: PULSE_TEST_TODAY,
          period: PulsePeriod.Last_7Days,
        });
        const benchmark = await viewer!.benchmarkResult({
          day: PULSE_TEST_TODAY,
          period: PulsePeriod.Last_7Days,
        });
        const digest = await viewer!.digestResult({ day: PULSE_TEST_TODAY });
        const status = await viewer!.status();

        // Then
        expect({
          lookup: errorCodes(lookup),
          trending: errorCodes(trending),
          benchmark: errorCodes(benchmark),
          digest: errorCodes(digest),
        }).toEqual({
          lookup: [PulseErrorCode.ContributionRequired],
          trending: [PulseErrorCode.ContributionRequired],
          benchmark: [PulseErrorCode.ContributionRequired],
          digest: [],
        });
        expect(await viewer!.salt(PULSE_TEST_TODAY)).toMatch(/^[0-9a-f]{32}$/);
        expect(status).toMatchObject({
          read_access: false,
          contribution_status: PulseContributionStatus.None,
          read_access_until: null,
          contribution_window_days: 7,
          contribution_grace_days: 14,
        });
      });

      it.each([
        {
          daysAgo: 6,
          status: PulseContributionStatus.Active,
          readAccess: true,
        },
        {
          daysAgo: 7,
          status: PulseContributionStatus.Grace,
          readAccess: true,
        },
        {
          daysAgo: 13,
          status: PulseContributionStatus.Grace,
          readAccess: true,
        },
        {
          daysAgo: 14,
          status: PulseContributionStatus.Lapsed,
          readAccess: false,
        },
      ])(
        'should report $status and read access $readAccess $daysAgo days after the last contribution',
        async ({ daysAgo, status, readAccess }) => {
          // Given a contribution `daysAgo` days ago
          const [client] = await registerPulseClients(1);
          clock.addDays(-daysAgo);
          await client!.push({
            day: clock.today(),
            records: [malware('lockbit')],
          });
          clock.addDays(daysAgo);

          // When
          const current = await client!.status();
          const lookup = await client!.lookupResult({
            day: PULSE_TEST_TODAY,
            objectType: MALWARE,
            values: ['lockbit'],
          });

          // Then
          expect(current).toMatchObject({
            contribution_status: status,
            read_access: readAccess,
            read_access_until: PulseDay.addDays(
              PulseDay.addDays(PULSE_TEST_TODAY, -daysAgo),
              13
            ),
          });
          expect(errorCodes(lookup)).toEqual(
            readAccess ? [] : [PulseErrorCode.ContributionRequired]
          );
        }
      );
    });
  }
);
