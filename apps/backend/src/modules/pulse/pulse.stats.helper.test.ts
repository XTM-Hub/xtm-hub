import { describe, expect, it } from 'vitest';
import {
  PulseContributionStatus,
  PulseEventKind,
  PulseObjectType,
  PulsePrevalenceBucket,
  PulseTrendDirection,
} from '../../__generated__/resolvers-types';
import { PulseStats } from './pulse.stats.helper';
import { PulseBenchmarkMetricRow, PulseBenchmarkMetrics } from './pulse.types';

const K = 5;

const makeMetricRow = (
  overrides: Partial<PulseBenchmarkMetricRow> = {}
): PulseBenchmarkMetricRow => ({
  objectType: PulseObjectType.Indicator,
  eventKind: PulseEventKind.Created,
  callerTotal: 10,
  callerSectorTotal: 10,
  networkMedian: 10,
  sectorMedian: 10,
  ...overrides,
});

const makeBenchmark = (
  overrides: Partial<PulseBenchmarkMetrics> = {}
): PulseBenchmarkMetrics => ({
  networkPlatforms: K,
  sectorPlatforms: K,
  metrics: [],
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
      {
        // Two reporters this week, nobody before: both below k, no direction.
        weekly: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        expected: PulseTrendDirection.Stable,
      },
      {
        // Every week in the 5-9 range: the exact counts inside it never show.
        weekly: [5, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0],
        expected: PulseTrendDirection.Stable,
      },
      {
        weekly: [9, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0],
        expected: PulseTrendDirection.Stable,
      },
      {
        weekly: [10, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0],
        expected: PulseTrendDirection.Rising,
      },
    ])(
      'should compare the last week with the mean of the 3 weeks before, each coarsened like platforms_bucket ($expected)',
      ({ weekly, expected }) => {
        // When
        const trend = PulseStats.weeklyTrend(weekly, K);

        // Then
        expect(trend).toBe(expected);
      }
    );
  });

  describe('coarseCount', () => {
    it.each([
      { count: 0, expected: 0 },
      { count: 4, expected: 0 },
      { count: 5, expected: 5 },
      { count: 9, expected: 5 },
      { count: 10, expected: 10 },
      { count: 49, expected: 25 },
      { count: 99, expected: 50 },
      { count: 249, expected: 100 },
      { count: 1000, expected: 250 },
    ])(
      'should return the lower bound of the platforms range of $count, 0 below k',
      ({ count, expected }) => {
        // When
        const coarse = PulseStats.coarseCount(count, K);

        // Then
        expect(coarse).toBe(expected);
      }
    );

    it('should return 0 for a count below a k larger than the smallest range', () => {
      // When k is 7, 6 reporters are below k although 6 is in the 5-9 range
      const coarse = PulseStats.coarseCount(6, 7);

      // Then
      expect(coarse).toBe(0);
    });
  });

  describe('trendSeries', () => {
    it('should return oldest first, 0 below k and the lower bound of each platforms range', () => {
      // Given newest first
      const weekly = [7, 4, 5, 0, 1, 2, 3, 4, 5, 6, 7, 8];

      // When
      const series = PulseStats.trendSeries(weekly, K);

      // Then
      expect(series).toEqual([5, 5, 5, 5, 0, 0, 0, 0, 0, 5, 0, 5]);
    });

    it('should never return an exact platform count', () => {
      // Given newest first
      const weekly = [260, 120, 51, 30, 12, 9, 0, 0, 0, 0, 0, 0];

      // When
      const series = PulseStats.trendSeries(weekly, K);

      // Then
      expect(series).toEqual([0, 0, 0, 0, 0, 0, 5, 10, 25, 50, 100, 250]);
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

  describe('emptyPresence', () => {
    it('should answer no platform over every week of the trend series', () => {
      // When
      const presence = PulseStats.emptyPresence();

      // Then
      expect(presence).toEqual({
        weekly: Array.from({ length: 12 }, () => 0),
        platformsInWindow: 0,
        sectorWeekly: Array.from({ length: 12 }, () => 0),
        sectorPlatformsInWindow: 0,
      });
    });
  });

  describe('summarizeBenchmark', () => {
    it('should return a metric for every object type and event kind pair', () => {
      // Given
      const benchmark = makeBenchmark({ metrics: [makeMetricRow()] });

      // When
      const { metrics } = PulseStats.summarizeBenchmark({
        benchmark,
        kThreshold: K,
      });

      // Then
      expect(metrics).toHaveLength(30);
    });

    it('should null every median below k active platforms', () => {
      // Given four active platforms network-wide and in the sector
      const benchmark = makeBenchmark({
        networkPlatforms: 4,
        sectorPlatforms: 4,
        metrics: [makeMetricRow()],
      });

      // When
      const { metrics } = PulseStats.summarizeBenchmark({
        benchmark,
        kThreshold: K,
      });

      // Then
      expect({
        reported: metrics[0],
        published: metrics.filter(
          (metric) =>
            metric.sector_median !== null || metric.network_median !== null
        ),
      }).toMatchObject({
        reported: {
          object_type: PulseObjectType.Indicator,
          event_kind: PulseEventKind.Created,
          platform_count: 10,
          sector_median: null,
          network_median: null,
        },
        published: [],
      });
    });

    it('should apply k to each population on its own', () => {
      // Given seven active platforms, four of them in the caller's sector
      const benchmark = makeBenchmark({
        networkPlatforms: 7,
        sectorPlatforms: 4,
        metrics: [makeMetricRow({ networkMedian: 4, sectorMedian: 3 })],
      });

      // When
      const { metrics } = PulseStats.summarizeBenchmark({
        benchmark,
        kThreshold: K,
      });

      // Then
      expect(metrics[0]).toMatchObject({
        sector_median: null,
        network_median: 4,
      });
    });

    it('should publish a 0 median for a pair no active platform reported', () => {
      // Given five active platforms that only reported created indicators
      const benchmark = makeBenchmark({ metrics: [makeMetricRow()] });

      // When
      const { metrics } = PulseStats.summarizeBenchmark({
        benchmark,
        kThreshold: K,
      });

      // Then
      expect(
        metrics.find(
          (metric) =>
            metric.object_type === PulseObjectType.Indicator &&
            metric.event_kind === PulseEventKind.Sighted
        )
      ).toEqual({
        object_type: PulseObjectType.Indicator,
        event_kind: PulseEventKind.Sighted,
        platform_count: 0,
        sector_platform_count: 0,
        sector_median: 0,
        network_median: 0,
      });
    });

    it('should keep the caller totals of both scopes and the population sizes', () => {
      // Given a caller that reported 100 events in its former sector and 1 in its current one
      const benchmark = makeBenchmark({
        networkPlatforms: 7,
        sectorPlatforms: 5,
        metrics: [
          makeMetricRow({
            callerTotal: 101,
            callerSectorTotal: 1,
            networkMedian: 2,
            sectorMedian: 2,
          }),
        ],
      });

      // When
      const summary = PulseStats.summarizeBenchmark({
        benchmark,
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
        metric: {
          platform_count: 101,
          sector_platform_count: 1,
          sector_median: 2,
          network_median: 2,
        },
      });
    });

    it('should clamp the caller totals to a GraphQL Int', () => {
      // Given
      const benchmark = makeBenchmark({
        metrics: [makeMetricRow({ callerTotal: 2 ** 40 })],
      });

      // When
      const { metrics } = PulseStats.summarizeBenchmark({
        benchmark,
        kThreshold: K,
      });

      // Then
      expect(metrics[0]?.platform_count).toBe(2 ** 31 - 1);
    });
  });

  describe('decideRateLimit', () => {
    const NOW_SECONDS = 1_000_000;
    const WINDOW = 3600;
    const BUCKET = 60;

    it('should allow a request under the limit', () => {
      // Given
      const buckets = [{ startSeconds: NOW_SECONDS - 120, count: 2 }];

      // When
      const decision = PulseStats.decideRateLimit({
        buckets,
        nowSeconds: NOW_SECONDS,
        windowSeconds: WINDOW,
        bucketSeconds: BUCKET,
        limit: 3,
      });

      // Then
      expect(decision).toEqual({ allowed: true, retryAfterSeconds: 0 });
    });

    it('should ignore buckets that left the rolling window', () => {
      // Given
      const buckets = [
        { startSeconds: NOW_SECONDS - WINDOW - BUCKET, count: 50 },
        { startSeconds: NOW_SECONDS - 60, count: 2 },
      ];

      // When
      const decision = PulseStats.decideRateLimit({
        buckets,
        nowSeconds: NOW_SECONDS,
        windowSeconds: WINDOW,
        bucketSeconds: BUCKET,
        limit: 3,
      });

      // Then
      expect(decision.allowed).toBe(true);
    });

    it('should keep counting a bucket until its end leaves the window', () => {
      // Given 3 requests at 10:00:59, stored under 10:00:00, and now 11:00:00
      const buckets = [{ startSeconds: NOW_SECONDS - WINDOW, count: 3 }];

      // When they are only 59 minutes old
      const decision = PulseStats.decideRateLimit({
        buckets,
        nowSeconds: NOW_SECONDS,
        windowSeconds: WINDOW,
        bucketSeconds: BUCKET,
        limit: 3,
      });

      // Then the allowance is not renewed before the bucket end leaves
      expect(decision).toEqual({ allowed: false, retryAfterSeconds: BUCKET });
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
        bucketSeconds: BUCKET,
        limit: 4,
      });

      // Then
      expect(decision).toEqual({
        allowed: false,
        retryAfterSeconds: WINDOW - 1000 + BUCKET,
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
        bucketSeconds: BUCKET,
        limit: 2,
      });

      // Then
      expect(decision.retryAfterSeconds).toBe(WINDOW - 2000 + BUCKET);
    });
  });
  describe('contributionState', () => {
    const TODAY = '2026-10-03';

    it.each([
      {
        last: null,
        status: PulseContributionStatus.None,
        readAccess: false,
        until: null,
      },
      {
        last: '2026-10-03',
        status: PulseContributionStatus.Active,
        readAccess: true,
        until: '2026-10-16',
      },
      {
        last: '2026-09-27',
        status: PulseContributionStatus.Active,
        readAccess: true,
        until: '2026-10-10',
      },
      {
        last: '2026-09-26',
        status: PulseContributionStatus.Grace,
        readAccess: true,
        until: '2026-10-09',
      },
      {
        last: '2026-09-20',
        status: PulseContributionStatus.Grace,
        readAccess: true,
        until: '2026-10-03',
      },
      {
        last: '2026-09-19',
        status: PulseContributionStatus.Lapsed,
        readAccess: false,
        until: '2026-10-02',
      },
    ])(
      'should be $status for a last contribution on $last',
      ({ last, status, readAccess, until }) => {
        expect(
          PulseStats.contributionState({
            lastContributionDay: last,
            today: TODAY,
            windowDays: 7,
            graceDays: 14,
          })
        ).toEqual({ status, readAccess, readAccessUntil: until });
      }
    );
  });
});
