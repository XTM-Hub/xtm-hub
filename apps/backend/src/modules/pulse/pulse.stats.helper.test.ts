import { describe, expect, it } from 'vitest';
import {
  PulseEventKind,
  PulseObjectType,
  PulsePrevalenceBucket,
  PulseTrendDirection,
} from '../../__generated__/resolvers-types';
import { PulseStats } from './pulse.stats.helper';
import { PulsePlatformTotal } from './pulse.types';

const K = 5;
const CALLER = 1;

const makeTotal = (
  overrides: Partial<PulsePlatformTotal> & { platform: number }
): PulsePlatformTotal => ({
  objectType: PulseObjectType.Indicator,
  eventKind: PulseEventKind.Created,
  total: 10,
  sectorTotal: 10,
  inSector: true,
  ...overrides,
});

describe('pulseStats', () => {
  describe('platformsBucket', () => {
    it.each([
      { count: 0, expected: '<5' },
      { count: 4, expected: '<5' },
      { count: 5, expected: '5-9' },
      { count: 9, expected: '5-9' },
      { count: 10, expected: '10-24' },
      { count: 24, expected: '10-24' },
      { count: 25, expected: '25-49' },
      { count: 49, expected: '25-49' },
      { count: 50, expected: '50-99' },
      { count: 99, expected: '50-99' },
      { count: 100, expected: '100-249' },
      { count: 249, expected: '100-249' },
      { count: 250, expected: '250+' },
      { count: 10000, expected: '250+' },
    ])('should bucket $count platforms as $expected', ({ count, expected }) => {
      // When
      const bucket = PulseStats.platformsBucket(count);

      // Then
      expect(bucket).toBe(expected);
    });
  });

  describe('prevalenceBucket', () => {
    it.each([
      {
        platformsInWindow: 4,
        activeContributors: 4,
        expected: PulsePrevalenceBucket.Rare,
        reason: 'below k even at 100 percent',
      },
      {
        platformsInWindow: 5,
        activeContributors: 0,
        expected: PulsePrevalenceBucket.Rare,
        reason: 'no active contributor',
      },
      {
        platformsInWindow: 5,
        activeContributors: 251,
        expected: PulsePrevalenceBucket.Rare,
        reason: 'just under 2 percent',
      },
      {
        platformsInWindow: 5,
        activeContributors: 250,
        expected: PulsePrevalenceBucket.Uncommon,
        reason: 'exactly 2 percent',
      },
      {
        platformsInWindow: 9,
        activeContributors: 100,
        expected: PulsePrevalenceBucket.Uncommon,
        reason: '9 percent',
      },
      {
        platformsInWindow: 10,
        activeContributors: 100,
        expected: PulsePrevalenceBucket.Common,
        reason: 'exactly 10 percent',
      },
      {
        platformsInWindow: 29,
        activeContributors: 100,
        expected: PulsePrevalenceBucket.Common,
        reason: '29 percent',
      },
      {
        platformsInWindow: 30,
        activeContributors: 100,
        expected: PulsePrevalenceBucket.Widespread,
        reason: 'exactly 30 percent',
      },
    ])(
      'should return $expected when $reason',
      ({ platformsInWindow, activeContributors, expected }) => {
        // When
        const bucket = PulseStats.prevalenceBucket({
          platformsInWindow,
          activeContributors,
          kThreshold: K,
        });

        // Then
        expect(bucket).toBe(expected);
      }
    );
  });

  describe('trendDirection', () => {
    it.each([
      { recent: 6, baseline: 4, expected: PulseTrendDirection.Rising },
      { recent: 3, baseline: 1, expected: PulseTrendDirection.Rising },
      { recent: 2, baseline: 1, expected: PulseTrendDirection.Stable },
      { recent: 5, baseline: 4, expected: PulseTrendDirection.Stable },
      { recent: 2, baseline: 0, expected: PulseTrendDirection.Rising },
      { recent: 0, baseline: 0, expected: PulseTrendDirection.Stable },
      { recent: 4, baseline: 6, expected: PulseTrendDirection.Falling },
      { recent: 1, baseline: 2, expected: PulseTrendDirection.Stable },
      { recent: 5, baseline: 7, expected: PulseTrendDirection.Stable },
      { recent: 0, baseline: 2, expected: PulseTrendDirection.Falling },
    ])(
      'should return $expected for recent $recent and baseline $baseline',
      ({ recent, baseline, expected }) => {
        // When
        const trend = PulseStats.trendDirection(recent, baseline);

        // Then
        expect(trend).toBe(expected);
      }
    );
  });

  describe('weeklyTrend', () => {
    it.each([
      {
        weekly: [9, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
        expected: PulseTrendDirection.Rising,
      },
      {
        weekly: [2, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0],
        expected: PulseTrendDirection.Falling,
      },
      {
        weekly: [6, 6, 6, 6, 9, 9, 9, 9, 9, 9, 9, 9],
        expected: PulseTrendDirection.Stable,
      },
    ])(
      'should compare the last week with the mean of the 3 weeks before ($expected)',
      ({ weekly, expected }) => {
        // When
        const trend = PulseStats.weeklyTrend(weekly);

        // Then
        expect(trend).toBe(expected);
      }
    );
  });

  describe('trendSeries', () => {
    it('should return oldest first and report weeks below k as 0', () => {
      // Given newest first
      const weekly = [7, 4, 5, 0, 1, 2, 3, 4, 5, 6, 7, 8];

      // When
      const series = PulseStats.trendSeries(weekly, K);

      // Then
      expect(series).toEqual([8, 7, 6, 5, 0, 0, 0, 0, 0, 5, 0, 7]);
    });
  });

  describe('growth', () => {
    it.each([
      { recent: 9, baseline: 4, expected: 2 },
      { recent: 0, baseline: 0, expected: 1 },
      { recent: 5, baseline: 9, expected: 0.6 },
    ])(
      'should return (recent + 1) / (baseline + 1) = $expected',
      ({ recent, baseline, expected }) => {
        // When
        const growth = PulseStats.growth(recent, baseline);

        // Then
        expect(growth).toBeCloseTo(expected);
      }
    );
  });

  describe('median', () => {
    it.each([
      { values: [], expected: null },
      { values: [7], expected: 7 },
      { values: [9, 1, 5], expected: 5 },
      { values: [4, 1, 3, 2], expected: 2.5 },
      { values: [0, 0, 0, 10, 20], expected: 0 },
    ])('should return $expected for $values', ({ values, expected }) => {
      // When
      const median = PulseStats.median(values);

      // Then
      expect(median).toBe(expected);
    });
  });

  describe('clampToGraphQLInt', () => {
    it.each([
      { value: 12.7, expected: 12 },
      { value: -3, expected: 0 },
      { value: 5_000_000_000, expected: 2147483647 },
    ])('should clamp $value to $expected', ({ value, expected }) => {
      // When
      const clamped = PulseStats.clampToGraphQLInt(value);

      // Then
      expect(clamped).toBe(expected);
    });
  });

  describe('summarizePresence', () => {
    it('should count distinct platforms per week and over 30 days', () => {
      // Given
      const presences = [
        { weeks: 0b1, inWindow: true, sectorWeeks: 0b1, sectorInWindow: true },
        { weeks: 0b11, inWindow: true, sectorWeeks: 0, sectorInWindow: false },
        {
          weeks: 0b100000000000,
          inWindow: false,
          sectorWeeks: 0b100000000000,
          sectorInWindow: false,
        },
      ];

      // When
      const summary = PulseStats.summarizePresence(presences);

      // Then
      expect(summary).toEqual({
        weekly: [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        platformsInWindow: 2,
        sectorWeekly: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        sectorPlatformsInWindow: 1,
      });
    });
  });

  describe('summarizeBenchmark', () => {
    it('should return a metric for every object type and event kind pair', () => {
      // Given
      const totals = [makeTotal({ platform: CALLER })];

      // When
      const { metrics } = PulseStats.summarizeBenchmark({
        totals,
        callerPlatform: CALLER,
        kThreshold: K,
      });

      // Then
      expect(metrics).toHaveLength(30);
    });

    it('should null every median below k active platforms', () => {
      // Given four platforms
      const totals = [1, 2, 3, 4].map((platform) => makeTotal({ platform }));

      // When
      const summary = PulseStats.summarizeBenchmark({
        totals,
        callerPlatform: CALLER,
        kThreshold: K,
      });

      // Then
      expect(summary.metrics[0]).toMatchObject({
        object_type: PulseObjectType.Indicator,
        event_kind: PulseEventKind.Created,
        platform_count: 10,
        sector_median: null,
        network_median: null,
      });
    });

    it('should count active platforms without the pair as 0 in the medians', () => {
      // Given five active platforms, two of them reporting sightings
      const totals = [
        ...[1, 2, 3, 4, 5].map((platform) => makeTotal({ platform })),
        makeTotal({
          platform: 1,
          eventKind: PulseEventKind.Sighted,
          total: 8,
          sectorTotal: 8,
        }),
        makeTotal({
          platform: 2,
          eventKind: PulseEventKind.Sighted,
          total: 4,
          sectorTotal: 4,
        }),
      ];

      // When
      const { metrics } = PulseStats.summarizeBenchmark({
        totals,
        callerPlatform: CALLER,
        kThreshold: K,
      });

      // Then
      expect(
        metrics.find(
          (metric) =>
            metric.object_type === PulseObjectType.Indicator &&
            metric.event_kind === PulseEventKind.Sighted
        )
      ).toMatchObject({
        platform_count: 8,
        sector_median: 0,
        network_median: 0,
      });
    });

    it('should compute the sector median over the sector platforms only', () => {
      // Given five sector platforms and two platforms of another sector
      const totals = [
        ...[1, 2, 3, 4, 5].map((platform) =>
          makeTotal({ platform, total: platform, sectorTotal: platform })
        ),
        makeTotal({ platform: 6, total: 100, sectorTotal: 0, inSector: false }),
        makeTotal({ platform: 7, total: 200, sectorTotal: 0, inSector: false }),
      ];

      // When
      const summary = PulseStats.summarizeBenchmark({
        totals,
        callerPlatform: CALLER,
        kThreshold: K,
      });

      // Then
      expect({
        sectorPlatforms: summary.sectorPlatforms,
        networkPlatforms: summary.networkPlatforms,
        metric: summary.metrics[0],
      }).toMatchObject({
        sectorPlatforms: 5,
        networkPlatforms: 7,
        metric: { platform_count: 1, sector_median: 3, network_median: 4 },
      });
    });
  });

  describe('decideRateLimit', () => {
    const NOW_SECONDS = 1_000_000;
    const WINDOW = 3600;

    it('should allow a request under the limit', () => {
      // Given
      const buckets = [{ startSeconds: NOW_SECONDS - 120, count: 2 }];

      // When
      const decision = PulseStats.decideRateLimit({
        buckets,
        nowSeconds: NOW_SECONDS,
        windowSeconds: WINDOW,
        limit: 3,
      });

      // Then
      expect(decision).toEqual({ allowed: true, retryAfterSeconds: 0 });
    });

    it('should ignore buckets that left the rolling window', () => {
      // Given
      const buckets = [
        { startSeconds: NOW_SECONDS - WINDOW, count: 50 },
        { startSeconds: NOW_SECONDS - 60, count: 2 },
      ];

      // When
      const decision = PulseStats.decideRateLimit({
        buckets,
        nowSeconds: NOW_SECONDS,
        windowSeconds: WINDOW,
        limit: 3,
      });

      // Then
      expect(decision.allowed).toBe(true);
    });

    it('should return when the oldest needed bucket leaves the window', () => {
      // Given 3 requests 1000 s ago and 2 requests 100 s ago, limit 4
      const buckets = [
        { startSeconds: NOW_SECONDS - 100, count: 2 },
        { startSeconds: NOW_SECONDS - 1000, count: 3 },
      ];

      // When
      const decision = PulseStats.decideRateLimit({
        buckets,
        nowSeconds: NOW_SECONDS,
        windowSeconds: WINDOW,
        limit: 4,
      });

      // Then
      expect(decision).toEqual({
        allowed: false,
        retryAfterSeconds: WINDOW - 1000,
      });
    });

    it('should wait for several buckets when one is not enough', () => {
      // Given limit 2 with 1 + 1 + 1 requests
      const buckets = [
        { startSeconds: NOW_SECONDS - 3000, count: 1 },
        { startSeconds: NOW_SECONDS - 2000, count: 1 },
        { startSeconds: NOW_SECONDS - 10, count: 1 },
      ];

      // When
      const decision = PulseStats.decideRateLimit({
        buckets,
        nowSeconds: NOW_SECONDS,
        windowSeconds: WINDOW,
        limit: 2,
      });

      // Then
      expect(decision.retryAfterSeconds).toBe(WINDOW - 2000);
    });
  });
});
