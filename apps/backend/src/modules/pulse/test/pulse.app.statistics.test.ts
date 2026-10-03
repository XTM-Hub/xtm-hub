import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  PulseEventKind,
  PulseObjectType,
  PulsePeriod,
  PulsePrevalenceBucket,
  PulseRegionBucket,
  PulseSectorBucket,
  PulseTrendDirection,
} from '../../../__generated__/resolvers-types';
import { PulseConfig } from '../pulse.config';
import {
  PULSE_PUBLICATION_POLICY_VERSION,
  PULSE_SCOPE_ALL,
} from '../pulse.const';
import { PulseDay } from '../pulse.day.helper';
import { PulseDomain } from '../pulse.domain';
import { PulseErrorCode } from '../pulse.errors';
import {
  cleanPulseState,
  errorCodes,
  PULSE_INTEGRATION_SUITE,
  PULSE_TEST_TODAY,
  PULSE_TEST_YESTERDAY,
  pushFromEach,
  registerPulseClients,
  usePulseClock,
} from './pulse.test.utils';

const LOCKBIT = 'lockbit';
const UNKNOWN = 'never-reported';
const MALWARE = PulseObjectType.Malware;
const UNPUBLISHED = {
  published: false,
  prevalence_bucket: null,
  platforms_bucket: null,
  first_seen_network: null,
  last_seen_network: null,
  trend: null,
  trend_series: null,
  sector_trend: null,
  sector_platforms_bucket: null,
};

const malware = (value: string, count = 1) => ({
  objectType: MALWARE,
  value,
  count,
});

describe('pulseApp statistics', PULSE_INTEGRATION_SUITE, () => {
  let clock: ReturnType<typeof usePulseClock>;

  beforeEach(() => {
    clock = usePulseClock();
  });

  afterEach(async () => {
    await cleanPulseState();
  });

  describe('pulseLookup k-anonymity', () => {
    it('should publish nothing about a key reported by fewer than k platforms', async () => {
      // Given
      const clients = await registerPulseClients(4);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const [result] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then
      expect(result).toMatchObject(UNPUBLISHED);
    });

    it('should publish the statistics once k platforms reported the key', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const expectedHash = await clients[0]!.hash(
        PULSE_TEST_TODAY,
        MALWARE,
        LOCKBIT
      );

      // When
      const [result] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then
      expect(result).toEqual({
        hash: expectedHash,
        published: true,
        prevalence_bucket: PulsePrevalenceBucket.Widespread,
        platforms_bucket: '5-9',
        first_seen_network: PULSE_TEST_TODAY,
        last_seen_network: PULSE_TEST_TODAY,
        trend: PulseTrendDirection.Rising,
        trend_series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
        sector_trend: PulseTrendDirection.Rising,
        sector_platforms_bucket: '5-9',
      });
    });

    it('should hide the sector trend while the caller sector has fewer than k platforms', async () => {
      // Given
      const finance = await registerPulseClients(3);
      const healthcare = await registerPulseClients(2);
      await pushFromEach(finance, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      await pushFromEach(healthcare, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
        sector: PulseSectorBucket.Healthcare,
      });

      // When
      const [result] = await finance[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then
      expect(result).toMatchObject({
        published: true,
        sector_trend: null,
        sector_platforms_bucket: null,
      });
    });

    it('should answer in the request order and keep unknown keys unpublished', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const results = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [UNKNOWN, LOCKBIT, UNKNOWN],
      });

      // Then
      expect(
        results.map(({ hash, published }) => ({ hash, published }))
      ).toEqual([
        {
          hash: await clients[0]!.hash(PULSE_TEST_TODAY, MALWARE, UNKNOWN),
          published: false,
        },
        {
          hash: await clients[0]!.hash(PULSE_TEST_TODAY, MALWARE, LOCKBIT),
          published: true,
        },
        {
          hash: await clients[0]!.hash(PULSE_TEST_TODAY, MALWARE, UNKNOWN),
          published: false,
        },
      ]);
    });

    it('should not publish a key under another object type', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const [result] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: PulseObjectType.Tool,
        values: [LOCKBIT],
      });

      // Then
      expect(result?.published).toBe(false);
    });

    it('should count platforms that reported the key on different days with different salts', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients.slice(0, 3), {
        day: PULSE_TEST_YESTERDAY,
        records: [malware(LOCKBIT)],
      });
      await pushFromEach(clients.slice(3), {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const [result] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then
      expect(result).toMatchObject({
        published: true,
        first_seen_network: PULSE_TEST_YESTERDAY,
        last_seen_network: PULSE_TEST_TODAY,
      });
    });

    it('should not count the platforms that first reported the key after the requested day', async () => {
      // Given four platforms yesterday, a fifth one today
      const clients = await registerPulseClients(5);
      await pushFromEach(clients.slice(0, 4), {
        day: PULSE_TEST_YESTERDAY,
        records: [malware(LOCKBIT)],
      });
      await clients[4]!.push({
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const [yesterday] = await clients[0]!.lookup({
        day: PULSE_TEST_YESTERDAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });
      const [today] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then
      expect({
        yesterday: yesterday?.published,
        today: today?.published,
      }).toEqual({ yesterday: false, today: true });
    });

    it('should report weeks below k as 0 in the trend series and never date the key from them', async () => {
      // Given two platforms one week ago, five this week
      const clients = await registerPulseClients(5);
      clock.addDays(-7);
      await pushFromEach(clients.slice(0, 2), {
        day: clock.today(),
        records: [malware(LOCKBIT)],
      });
      clock.addDays(7);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const [result] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      const trending = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
      });

      // Then the week of the two platforms bounds neither the series nor the dates
      expect(result).toMatchObject({
        trend: PulseTrendDirection.Rising,
        trend_series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
        first_seen_network: PULSE_TEST_TODAY,
        last_seen_network: PULSE_TEST_TODAY,
      });
      expect(trending.items[0]?.first_seen_network).toBe(PULSE_TEST_TODAY);
    });

    it('should keep the last day of the latest week that reached k', async () => {
      // Given five platforms two weeks ago, then one platform this week
      const clients = await registerPulseClients(5);
      clock.addDays(-14);
      await pushFromEach(clients, {
        day: clock.today(),
        records: [malware(LOCKBIT)],
      });
      clock.addDays(14);
      await pushFromEach(clients.slice(0, 1), {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const [result] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then the single reporter of this week does not move the last seen day
      expect(result).toMatchObject({
        first_seen_network: PulseDay.addDays(PULSE_TEST_TODAY, -14),
        last_seen_network: PulseDay.addDays(PULSE_TEST_TODAY, -14),
      });
    });

    it('should rate the prevalence against the active contributors', async () => {
      // Given 5 platforms on the key among 25 active contributors
      const reporters = await registerPulseClients(5);
      const others = await registerPulseClients(20);
      await pushFromEach(reporters, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      await pushFromEach(others, {
        day: PULSE_TEST_TODAY,
        records: [malware('emotet')],
      });

      // When
      const [result] = await reporters[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then
      expect(result?.prevalence_bucket).toBe(PulsePrevalenceBucket.Common);
    });
  });

  describe('pulseTrending', () => {
    it('should rank rising keys first and leave out keys below k', async () => {
      // Given
      const clients = await registerPulseClients(6);
      for (const daysAgo of [17, 10]) {
        clock.setTime(`${PULSE_TEST_TODAY}T10:00:00.000Z`);
        clock.addDays(-daysAgo);
        await pushFromEach(clients.slice(0, 5), {
          day: clock.today(),
          records: [malware('stable-family')],
        });
      }
      clock.setTime(`${PULSE_TEST_TODAY}T10:00:00.000Z`);
      await pushFromEach(clients.slice(0, 5), {
        day: PULSE_TEST_TODAY,
        records: [malware('stable-family')],
      });
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware('rising-family')],
      });
      await pushFromEach(clients.slice(0, 4), {
        day: PULSE_TEST_TODAY,
        records: [malware('confidential-family')],
      });

      // When
      const trending = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
      });

      // Then
      expect(trending).toEqual({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
        sector_bucket: null,
        region_bucket: null,
        items: [
          {
            hash: await clients[0]!.hash(
              PULSE_TEST_TODAY,
              MALWARE,
              'rising-family'
            ),
            object_type: MALWARE,
            platforms_bucket: '5-9',
            prevalence_bucket: PulsePrevalenceBucket.Widespread,
            trend: PulseTrendDirection.Rising,
            growth: 6,
            first_seen_network: PULSE_TEST_TODAY,
          },
          {
            hash: await clients[0]!.hash(
              PULSE_TEST_TODAY,
              MALWARE,
              'stable-family'
            ),
            object_type: MALWARE,
            platforms_bucket: '5-9',
            prevalence_bucket: PulsePrevalenceBucket.Widespread,
            trend: PulseTrendDirection.Stable,
            growth: 1,
            first_seen_network: PulseDay.addDays(PULSE_TEST_TODAY, -17),
          },
        ],
      });
    });

    it.each([
      {
        scope: 'the healthcare sector',
        input: { sector_bucket: PulseSectorBucket.Healthcare },
        expected: ['health-family'],
      },
      {
        scope: 'the finance sector',
        input: { sector_bucket: PulseSectorBucket.Finance },
        expected: ['finance-family'],
      },
      {
        scope: 'a region without contributors',
        input: { region_bucket: PulseRegionBucket.NorthAmerica },
        expected: [],
      },
    ])(
      'should only rank keys reaching k platforms in $scope',
      async ({ input, expected }) => {
        // Given
        const finance = await registerPulseClients(5);
        const healthcare = await registerPulseClients(5);
        await pushFromEach(finance, {
          day: PULSE_TEST_TODAY,
          records: [malware('finance-family')],
        });
        await pushFromEach(healthcare, {
          day: PULSE_TEST_TODAY,
          records: [malware('health-family')],
          sector: PulseSectorBucket.Healthcare,
        });
        const expectedHashes = await Promise.all(
          expected.map((value) =>
            finance[0]!.hash(PULSE_TEST_TODAY, MALWARE, value)
          )
        );

        // When
        const trending = await finance[0]!.trending({
          day: PULSE_TEST_TODAY,
          period: PulsePeriod.Last_30Days,
          ...input,
        });

        // Then
        expect(trending.items.map((item) => item.hash)).toEqual(expectedHashes);
      }
    );

    it('should filter object types and honor first', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [
          malware('family-a'),
          malware('family-b'),
          { objectType: PulseObjectType.Tool, value: 'cobalt strike' },
        ],
      });

      // When
      const tools = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
        object_types: [PulseObjectType.Tool],
      });
      const firstOnly = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
        first: 1,
      });

      // Then
      expect({
        tools: tools.items.map((item) => item.object_type),
        firstOnly: firstOnly.items.length,
      }).toEqual({ tools: [PulseObjectType.Tool], firstOnly: 1 });
    });

    it('should serve the cached ranking until its TTL expires', async () => {
      // Given
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware('first-family')],
      });
      const request = { day: PULSE_TEST_TODAY, period: PulsePeriod.Last_7Days };
      await clients[0]!.trending(request);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware('second-family')],
      });

      // When
      const cached = await clients[0]!.trending(request);
      clock.addMinutes(61);
      const refreshed = await clients[0]!.trending(request);

      // Then
      expect({
        cached: cached.items.length,
        refreshed: refreshed.items.length,
      }).toEqual({ cached: 1, refreshed: 2 });
    });

    it('should not reveal a previous period below k through the growth', async () => {
      // Given two platforms 10 days ago (previous 7-day period), five today
      const clients = await registerPulseClients(5);
      clock.addDays(-10);
      await pushFromEach(clients.slice(0, 2), {
        day: clock.today(),
        records: [malware(LOCKBIT)],
      });
      clock.addDays(10);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const trending = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
      });
      const [lookup] = await clients[0]!.lookup({
        day: PULSE_TEST_TODAY,
        objectType: MALWARE,
        values: [LOCKBIT],
      });

      // Then the growth is the one of an empty history, and the series hides it too
      expect(trending.items[0]?.growth).toBe(6);
      expect(lookup?.trend_series?.slice(-3)).toEqual([0, 0, 5]);
    });

    it('should publish the same growth for every reporter count of a platforms range', async () => {
      // Given a family reported by five platforms and another by nine, both first seen today
      const clients = await registerPulseClients(9);
      await pushFromEach(clients.slice(0, 5), {
        day: PULSE_TEST_TODAY,
        records: [malware('five-reporters')],
      });
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware('nine-reporters')],
      });

      // When
      const trending = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
      });

      // Then neither the growth nor the bucket tells five from nine
      expect(
        trending.items.map(({ platforms_bucket, growth }) => ({
          platforms_bucket,
          growth,
        }))
      ).toEqual([
        { platforms_bucket: '5-9', growth: 6 },
        { platforms_bucket: '5-9', growth: 6 },
      ]);
    });

    it('should coarsen the trending counts once when k is not a bucket boundary', async () => {
      // Given k=7 and a family reported by seven platforms today
      const config = PulseConfig.get();
      if (!config.enabled) {
        throw new Error('Threat Pulse must be enabled in tests');
      }
      vi.spyOn(PulseConfig, 'get').mockReturnValue({
        ...config,
        settings: { ...config.settings, kThreshold: 7 },
      });
      const clients = await registerPulseClients(7);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const trending = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
      });

      // Then seven reporters publish the 5-9 range, not a count below k
      expect(
        trending.items.map(({ platforms_bucket, growth, trend }) => ({
          platforms_bucket,
          growth,
          trend,
        }))
      ).toEqual([
        {
          platforms_bucket: '5-9',
          growth: 6,
          trend: PulseTrendDirection.Rising,
        },
      ]);
    });

    it('should never serve a fresh snapshot published under another k', async () => {
      // Given a snapshot computed with k=5
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const request = { day: PULSE_TEST_TODAY, period: PulsePeriod.Last_7Days };
      const before = await clients[0]!.trending(request);
      const config = PulseConfig.get();
      if (!config.enabled) {
        throw new Error('Threat Pulse must be enabled in tests');
      }
      vi.spyOn(PulseConfig, 'get').mockReturnValue({
        ...config,
        settings: { ...config.settings, kThreshold: 10 },
      });

      // When k is raised to 10 while the snapshot is fresh
      const after = await clients[0]!.trending(request);

      // Then
      expect({
        before: before.items.length,
        after: after.items.length,
      }).toEqual({ before: 1, after: 0 });
    });

    it('should never serve a fresh snapshot computed under another retention', async () => {
      // Given a ranking whose first seen day is 300 days old, computed under a 13-month retention
      const clients = await registerPulseClients(5);
      clock.setTime(`${PULSE_TEST_TODAY}T10:00:00.000Z`);
      clock.addDays(-300);
      const longAgo = clock.today();
      await pushFromEach(clients, {
        day: longAgo,
        records: [malware(LOCKBIT)],
      });
      clock.setTime(`${PULSE_TEST_TODAY}T10:00:00.000Z`);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      const request = { day: PULSE_TEST_TODAY, period: PulsePeriod.Last_7Days };
      const before = await clients[0]!.trending(request);
      const config = PulseConfig.get();
      if (!config.enabled) {
        throw new Error('Threat Pulse must be enabled in tests');
      }
      vi.spyOn(PulseConfig, 'get').mockReturnValue({
        ...config,
        retentionMonths: 9,
        settings: { ...config.settings, retentionMonths: 9 },
      });

      // When the retention is lowered to 9 months while the snapshot is fresh
      const after = await clients[0]!.trending(request);

      // Then the first seen day no longer reaches beyond the retention
      expect({
        before: before.items[0]?.first_seen_network,
        after: after.items[0]?.first_seen_network,
      }).toEqual({ before: longAgo, after: PULSE_TEST_TODAY });
    });

    it('should recompute a snapshot published under an older policy version', async () => {
      // Given a fresh snapshot of an older publication policy
      const clients = await registerPulseClients(5);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });
      await PulseDomain.saveTrendingSnapshot({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
        sectorScope: PULSE_SCOPE_ALL,
        regionScope: PULSE_SCOPE_ALL,
        computedAt: clock.now(),
        policy: {
          version: PULSE_PUBLICATION_POLICY_VERSION - 1,
          kThreshold: 5,
          retentionMonths: 13,
        },
        generation: await PulseDomain.loadDataGeneration(),
        items: [],
      });

      // When
      const result = await clients[0]!.trending({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
      });

      // Then
      expect(result.items).toHaveLength(1);
    });
  });

  describe('pulseBenchmark', () => {
    it('should answer FORBIDDEN when platformId is not the calling platform', async () => {
      // Given
      const [caller, other] = await registerPulseClients(2);
      await caller!.push({
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT)],
      });

      // When
      const result = await caller!.benchmarkResult({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
        platformId: other!.platform.platformId,
      });

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.Forbidden]);
    });

    it('should not publish any median below k active platforms', async () => {
      // Given
      const clients = await registerPulseClients(4);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT, 3)],
      });

      // When
      const benchmark = await clients[0]!.benchmark({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
      });

      // Then
      expect({
        sectorPlatforms: benchmark.sector_platforms_bucket,
        medians: benchmark.metrics.filter(
          (metric) =>
            metric.sector_median !== null || metric.network_median !== null
        ),
        topItems: benchmark.top_items,
      }).toEqual({ sectorPlatforms: null, medians: [], topItems: [] });
    });

    it('should compare the caller with the sector medians and list its top published keys', async () => {
      // Given
      const clients = await registerPulseClients(5);
      const counts = [10, 1, 2, 3, 4];
      for (const [index, client] of clients.entries()) {
        await client.push({
          day: PULSE_TEST_TODAY,
          records: [malware(LOCKBIT, counts[index])],
        });
      }
      await clients[0]!.push({
        day: PULSE_TEST_TODAY,
        records: [
          {
            objectType: PulseObjectType.Indicator,
            value: 'observable:ipv4-addr:value:198.51.100.7',
            eventKind: PulseEventKind.Sighted,
            count: 7,
          },
        ],
      });

      // When
      const benchmark = await clients[0]!.benchmark({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
      });

      // Then
      expect({
        sector: benchmark.sector_bucket,
        region: benchmark.region_bucket,
        sectorPlatforms: benchmark.sector_platforms_bucket,
        metrics: benchmark.metrics.filter(
          (metric) => metric.platform_count > 0
        ),
        topItems: benchmark.top_items,
      }).toEqual({
        sector: PulseSectorBucket.Finance,
        region: PulseRegionBucket.Europe,
        sectorPlatforms: '5-9',
        metrics: [
          {
            object_type: PulseObjectType.Indicator,
            event_kind: PulseEventKind.Sighted,
            platform_count: 7,
            sector_median: 0,
            network_median: 0,
          },
          {
            object_type: MALWARE,
            event_kind: PulseEventKind.Created,
            platform_count: 10,
            sector_median: 3,
            network_median: 3,
          },
        ],
        topItems: [
          {
            hash: await clients[0]!.hash(PULSE_TEST_TODAY, MALWARE, LOCKBIT),
            object_type: MALWARE,
            platform_count: 10,
            sector_median: 3,
            ratio: 3.3333,
          },
        ],
      });
    });

    it('should list only the keys above the sector median, strongest relative outliers first', async () => {
      // Given the caller far above a low median, above a high median, and below a median
      const clients = await registerPulseClients(5);
      const reports: Array<{ family: string; caller: number; others: number }> =
        [
          { family: 'low-median-family', caller: 4, others: 1 },
          { family: 'high-median-family', caller: 20, others: 10 },
          { family: 'below-median-family', caller: 1, others: 5 },
        ];
      for (const [index, client] of clients.entries()) {
        await client.push({
          day: PULSE_TEST_TODAY,
          records: reports.map(({ family, caller, others }) =>
            malware(family, index === 0 ? caller : others)
          ),
        });
      }

      // When
      const benchmark = await clients[0]!.benchmark({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
      });

      // Then the ratio orders the items, not the raw count
      expect(benchmark.top_items).toEqual([
        {
          hash: await clients[0]!.hash(
            PULSE_TEST_TODAY,
            MALWARE,
            'low-median-family'
          ),
          object_type: MALWARE,
          platform_count: 4,
          sector_median: 1,
          ratio: 4,
        },
        {
          hash: await clients[0]!.hash(
            PULSE_TEST_TODAY,
            MALWARE,
            'high-median-family'
          ),
          object_type: MALWARE,
          platform_count: 20,
          sector_median: 10,
          ratio: 2,
        },
      ]);
    });

    it('should count the active sector platforms that did not report a key as 0 in its median', async () => {
      // Given seven active finance platforms, five of them reporting LockBit with totals 3 (the caller), 1, 2, 4 and 10
      const clients = await registerPulseClients(7);
      const lockbitCounts = [3, 1, 2, 4, 10];
      for (const [index, client] of clients.entries()) {
        await client.push({
          day: PULSE_TEST_TODAY,
          records: [
            index < lockbitCounts.length
              ? malware(LOCKBIT, lockbitCounts[index])
              : malware('other-family'),
          ],
        });
      }

      // When
      const benchmark = await clients[0]!.benchmark({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
      });

      // Then the median of 0, 0, 1, 2, 3, 4, 10 is 2, and the caller is above it
      expect(benchmark.top_items).toEqual([
        {
          hash: await clients[0]!.hash(PULSE_TEST_TODAY, MALWARE, LOCKBIT),
          object_type: MALWARE,
          platform_count: 3,
          sector_median: 2,
          ratio: 1.5,
        },
      ]);
    });

    it('should count only the days of the requested period', async () => {
      // Given
      const clients = await registerPulseClients(5);
      clock.addDays(-20);
      await pushFromEach(clients, {
        day: clock.today(),
        records: [malware(LOCKBIT, 5)],
      });
      clock.addDays(20);
      await pushFromEach(clients, {
        day: PULSE_TEST_TODAY,
        records: [malware(LOCKBIT, 1)],
      });

      // When
      const lastWeek = await clients[0]!.benchmark({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_7Days,
      });
      const lastMonth = await clients[0]!.benchmark({
        day: PULSE_TEST_TODAY,
        period: PulsePeriod.Last_30Days,
      });
      const lockbitCreated = (metrics: typeof lastWeek.metrics) =>
        metrics.find(
          (metric) =>
            metric.object_type === MALWARE &&
            metric.event_kind === PulseEventKind.Created
        )?.platform_count;

      // Then
      expect({
        lastWeek: lockbitCreated(lastWeek.metrics),
        lastMonth: lockbitCreated(lastMonth.metrics),
      }).toEqual({ lastWeek: 1, lastMonth: 6 });
    });
  });

  it('should keep the platform pseudonymous across the statistics tables', async () => {
    // Given
    const clients = await registerPulseClients(5);
    await pushFromEach(clients, {
      day: PULSE_TEST_TODAY,
      records: [malware(LOCKBIT)],
    });

    // When
    const dump = await TestHelper.pulse.dumpTables();

    // Then
    expect(
      clients
        .map((client) => client.platform.platformId)
        .filter((platformId) => dump.includes(platformId))
    ).toEqual([]);
  });
});
