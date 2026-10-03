import { describe, expect, it } from 'vitest';
import {
  PulseEventKind,
  PulseObjectType,
  PulsePrevalenceBucket,
  PulseTrendDirection,
} from '../../__generated__/resolvers-types';
import { PulseHelper } from './pulse.helper';
import { PulsePresenceSummary } from './pulse.stats.helper';
import { PulseLedgerRecord, PulseTrendingCount } from './pulse.types';

const K = 5;
const HASH = '9913881f71e8c61c79d05b20cf144d42';
const KEY_A = 'aaaa0000000000000000000000000000';
const KEY_B = 'bbbb0000000000000000000000000000';
const SEEN = { firstSeen: '2026-07-01', lastSeen: '2026-10-03' };

const makeRecord = (
  overrides: Partial<PulseLedgerRecord> = {}
): PulseLedgerRecord => ({
  k: KEY_A,
  t: PulseObjectType.Indicator,
  e: PulseEventKind.Created,
  c: 1,
  ...overrides,
});

const makePresence = (
  overrides: Partial<PulsePresenceSummary> = {}
): PulsePresenceSummary => ({
  weekly: [9, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
  platformsInWindow: 9,
  sectorWeekly: Array(12).fill(0),
  sectorPlatformsInWindow: 0,
  ...overrides,
});

const makeCount = (
  overrides: Partial<PulseTrendingCount> = {}
): PulseTrendingCount => ({
  k: KEY_A,
  t: PulseObjectType.Malware,
  recent: 5,
  prev1: 5,
  prev2: 5,
  ...overrides,
});

describe('pulseHelper', () => {
  describe('aggregateBatch', () => {
    it('should count a platform once per key and sum the event kinds', () => {
      // Given
      const records = [
        makeRecord({ c: 3 }),
        makeRecord({ e: PulseEventKind.Sighted, c: 2 }),
        makeRecord({ k: KEY_B, c: 7 }),
      ];

      // When
      const aggregation = PulseHelper.aggregateBatch(records, new Set());

      // Then
      expect(aggregation.aggregates).toEqual([
        {
          k: KEY_A,
          t: PulseObjectType.Indicator,
          p: 1,
          created: 3,
          sighted: 2,
          detected: 0,
          hunted: 0,
          referenced: 0,
        },
        {
          k: KEY_B,
          t: PulseObjectType.Indicator,
          p: 1,
          created: 7,
          sighted: 0,
          detected: 0,
          hunted: 0,
          referenced: 0,
        },
      ]);
    });

    it('should not count the platform again on a key it already reported that day', () => {
      // Given
      const records = [makeRecord(), makeRecord({ k: KEY_B })];

      // When
      const aggregation = PulseHelper.aggregateBatch(
        records,
        new Set([`${KEY_A}:${PulseObjectType.Indicator}`])
      );

      // Then
      expect(aggregation.aggregates.map(({ k, p }) => ({ k, p }))).toEqual([
        { k: KEY_A, p: 0 },
        { k: KEY_B, p: 1 },
      ]);
    });

    it('should sum the batch per object type and event kind', () => {
      // Given
      const records = [
        makeRecord({ c: 3 }),
        makeRecord({ k: KEY_B, c: 4 }),
        makeRecord({ t: PulseObjectType.Malware, e: PulseEventKind.Hunted }),
      ];

      // When
      const aggregation = PulseHelper.aggregateBatch(records, new Set());

      // Then
      expect(aggregation.totals).toEqual([
        { t: PulseObjectType.Indicator, e: PulseEventKind.Created, c: 7 },
        { t: PulseObjectType.Malware, e: PulseEventKind.Hunted, c: 1 },
      ]);
    });
  });

  describe('rankTrending', () => {
    it('should rank by growth then recent platforms then key', () => {
      // Given
      const counts = [
        makeCount({ k: 'k-stable', recent: 10, prev1: 10, prev2: 10 }),
        makeCount({ k: 'k-rising', recent: 9, prev1: 4, prev2: 4 }),
        makeCount({ k: 'k-rising-bigger', recent: 19, prev1: 9, prev2: 9 }),
        makeCount({ k: 'k-same-b', recent: 5, prev1: 5, prev2: 5 }),
        makeCount({ k: 'k-same-a', recent: 5, prev1: 5, prev2: 5 }),
      ];

      // When
      const ranked = PulseHelper.rankTrending(counts);

      // Then
      expect(ranked.map(({ k, growth }) => ({ k, growth }))).toEqual([
        { k: 'k-rising-bigger', growth: 2 },
        { k: 'k-rising', growth: 2 },
        { k: 'k-stable', growth: 1 },
        { k: 'k-same-a', growth: 1 },
        { k: 'k-same-b', growth: 1 },
      ]);
    });

    it('should keep at most 200 items per object type', () => {
      // Given
      const counts = [
        ...Array.from({ length: 250 }, (_, index) =>
          makeCount({ k: `malware-${index}`, t: PulseObjectType.Malware })
        ),
        makeCount({ k: 'tool-0', t: PulseObjectType.Tool }),
      ];

      // When
      const ranked = PulseHelper.rankTrending(counts);

      // Then
      expect({
        malware: ranked.filter((i) => i.t === PulseObjectType.Malware).length,
        tool: ranked.filter((i) => i.t === PulseObjectType.Tool).length,
      }).toEqual({ malware: 200, tool: 1 });
    });
  });

  describe('buildLookupResult', () => {
    it.each([
      { description: 'below k platforms', networkPlatforms: 4, seen: SEEN },
      { description: 'with no aggregate left', networkPlatforms: 9, seen: undefined },
    ])(
      'should return every statistic as null $description',
      ({ networkPlatforms, seen }) => {
        // When
        const result = PulseHelper.buildLookupResult({
          hash: HASH,
          networkPlatforms,
          seen,
          presence: makePresence(),
          activeContributors: 20,
          kThreshold: K,
        });

        // Then
        expect(result).toEqual({
          hash: HASH,
          published: false,
          prevalence_bucket: null,
          platforms_bucket: null,
          first_seen_network: null,
          last_seen_network: null,
          trend: null,
          trend_series: null,
          sector_trend: null,
          sector_platforms_bucket: null,
        });
      }
    );

    it('should publish the network statistics at k platforms', () => {
      // When
      const result = PulseHelper.buildLookupResult({
        hash: HASH,
        networkPlatforms: K,
        seen: SEEN,
        presence: makePresence(),
        activeContributors: 20,
        kThreshold: K,
      });

      // Then
      expect(result).toEqual({
        hash: HASH,
        published: true,
        prevalence_bucket: PulsePrevalenceBucket.Widespread,
        platforms_bucket: '5-9',
        first_seen_network: SEEN.firstSeen,
        last_seen_network: SEEN.lastSeen,
        trend: PulseTrendDirection.Rising,
        trend_series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
        sector_trend: null,
        sector_platforms_bucket: null,
      });
    });

    it('should publish the sector trend once the sector reaches k platforms over 30 days', () => {
      // Given
      const presence = makePresence({
        sectorWeekly: [1, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0],
        sectorPlatformsInWindow: K,
      });

      // When
      const result = PulseHelper.buildLookupResult({
        hash: HASH,
        networkPlatforms: 12,
        seen: SEEN,
        presence,
        activeContributors: 20,
        kThreshold: K,
      });

      // Then
      expect(result).toMatchObject({
        platforms_bucket: '10-24',
        sector_trend: PulseTrendDirection.Falling,
        sector_platforms_bucket: '5-9',
      });
    });
  });
});
