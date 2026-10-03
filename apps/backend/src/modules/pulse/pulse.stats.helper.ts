import {
  PulseBenchmarkMetric,
  PulseContributionStatus,
  PulseEventKind,
  PulseObjectType,
  PulsePrevalenceBucket,
  PulseTrendDirection,
} from '../../__generated__/resolvers-types';
import {
  PULSE_BELOW_SMALLEST_BUCKET_LABEL,
  PULSE_EVENT_KINDS,
  PULSE_GRAPHQL_INT_MAX,
  PULSE_OBJECT_TYPES,
  PULSE_PLATFORMS_BUCKETS,
  PULSE_PREVALENCE_COMMON_BELOW,
  PULSE_PREVALENCE_RARE_BELOW,
  PULSE_PREVALENCE_UNCOMMON_BELOW,
  PULSE_TREND_BASELINE_WEEKS,
  PULSE_TREND_FALLING_RATIO,
  PULSE_TREND_MIN_DELTA,
  PULSE_TREND_RISING_RATIO,
  PULSE_TREND_SERIES_WEEKS,
} from './pulse.const';
import { PulseDay } from './pulse.day.helper';
import {
  PulsePlatformTotal,
  PulsePresence,
  PulseRateLimitBucket,
} from './pulse.types';

export interface PulseRateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface PulsePresenceSummary {
  weekly: number[];
  platformsInWindow: number;
  sectorWeekly: number[];
  sectorPlatformsInWindow: number;
}

export interface PulseBenchmarkSummary {
  metrics: PulseBenchmarkMetric[];
  sectorPlatforms: number;
  networkPlatforms: number;
}

export interface PulseContributionState {
  status: PulseContributionStatus;
  readAccess: boolean;
  readAccessUntil: string | null;
}

const ROUNDING_DECIMALS = 4;

const weeklyCountsFromMasks = (masks: readonly number[]): number[] =>
  Array.from(
    { length: PULSE_TREND_SERIES_WEEKS },
    (_, week) => masks.filter((mask) => (mask & (1 << week)) !== 0).length
  );

const metricKey = (objectType: PulseObjectType, eventKind: PulseEventKind) =>
  `${objectType}:${eventKind}`;

export const PulseStats = {
  // Reciprocity: a platform reads lookups, trending and benchmarks while its
  // last contribution is within the grace period; inside the (shorter)
  // contribution window it is an active contributor.
  contributionState: ({
    lastContributionDay,
    today,
    windowDays,
    graceDays,
  }: {
    lastContributionDay: string | null;
    today: string;
    windowDays: number;
    graceDays: number;
  }): PulseContributionState => {
    if (!lastContributionDay) {
      return {
        status: PulseContributionStatus.None,
        readAccess: false,
        readAccessUntil: null,
      };
    }
    const readAccessUntil = PulseDay.addDays(
      lastContributionDay,
      graceDays - 1
    );
    if (lastContributionDay >= PulseDay.addDays(today, -(windowDays - 1))) {
      return {
        status: PulseContributionStatus.Active,
        readAccess: true,
        readAccessUntil,
      };
    }
    if (today <= readAccessUntil) {
      return {
        status: PulseContributionStatus.Grace,
        readAccess: true,
        readAccessUntil,
      };
    }
    return {
      status: PulseContributionStatus.Lapsed,
      readAccess: false,
      readAccessUntil,
    };
  },

  platformsBucket: (count: number): string =>
    PULSE_PLATFORMS_BUCKETS.find((bucket) => count >= bucket.min)?.label ??
    PULSE_BELOW_SMALLEST_BUCKET_LABEL,

  // The network size every connected platform reads: below the anonymity
  // threshold it only says so, whatever the bucket the count falls in.
  contributorsBucket: (count: number, kThreshold: number): string =>
    count < kThreshold ? `<${kThreshold}` : PulseStats.platformsBucket(count),

  prevalenceBucket: ({
    platformsInWindow,
    activeContributors,
    kThreshold,
  }: {
    platformsInWindow: number;
    activeContributors: number;
    kThreshold: number;
  }): PulsePrevalenceBucket => {
    if (platformsInWindow < kThreshold || activeContributors <= 0) {
      return PulsePrevalenceBucket.Rare;
    }
    const share = platformsInWindow / activeContributors;
    if (share < PULSE_PREVALENCE_RARE_BELOW) {
      return PulsePrevalenceBucket.Rare;
    }
    if (share < PULSE_PREVALENCE_UNCOMMON_BELOW) {
      return PulsePrevalenceBucket.Uncommon;
    }
    if (share < PULSE_PREVALENCE_COMMON_BELOW) {
      return PulsePrevalenceBucket.Common;
    }
    return PulsePrevalenceBucket.Widespread;
  },

  trendDirection: (recent: number, baseline: number): PulseTrendDirection => {
    if (
      recent >= PULSE_TREND_RISING_RATIO * baseline &&
      recent - baseline >= PULSE_TREND_MIN_DELTA
    ) {
      return PulseTrendDirection.Rising;
    }
    if (
      recent <= PULSE_TREND_FALLING_RATIO * baseline &&
      baseline - recent >= PULSE_TREND_MIN_DELTA
    ) {
      return PulseTrendDirection.Falling;
    }
    return PulseTrendDirection.Stable;
  },

  // A count below k is never published, nor anything derived from it: it
  // weighs as 0 in every published figure, direction and ranking.
  suppressBelowK: (count: number, kThreshold: number): number =>
    count >= kThreshold ? count : 0,

  // Weekly counts are newest first: week 0 is the recent week, the baseline is
  // the mean of the 3 weeks before it, each week suppressed below k.
  weeklyTrend: (
    weeklyNewestFirst: readonly number[],
    kThreshold: number
  ): PulseTrendDirection => {
    const weekly = weeklyNewestFirst.map((count) =>
      PulseStats.suppressBelowK(count, kThreshold)
    );
    const recent = weekly[0] ?? 0;
    const baselineWeeks = weekly.slice(1, 1 + PULSE_TREND_BASELINE_WEEKS);
    const baseline =
      baselineWeeks.reduce((sum, count) => sum + count, 0) /
      PULSE_TREND_BASELINE_WEEKS;
    return PulseStats.trendDirection(recent, baseline);
  },

  // Lower bound of the platforms range of a count (5, 10, 25, ...), 0 below
  // k: a figure derived from it is exactly as coarse as platforms_bucket.
  coarseCount: (count: number, kThreshold: number): number =>
    count >= kThreshold
      ? (PULSE_PLATFORMS_BUCKETS.find((bucket) => count >= bucket.min)?.min ??
        0)
      : 0,

  // Oldest week first, each week coarsened like platforms_bucket.
  trendSeries: (
    weeklyNewestFirst: readonly number[],
    kThreshold: number
  ): number[] =>
    [...weeklyNewestFirst]
      .reverse()
      .map((count) => PulseStats.coarseCount(count, kThreshold)),

  growth: (recent: number, baseline: number): number =>
    (recent + 1) / (baseline + 1),

  median: (values: readonly number[]): number | null => {
    if (values.length === 0) {
      return null;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
      return sorted[middle] ?? null;
    }
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  },

  round: (value: number): number => {
    const factor = 10 ** ROUNDING_DECIMALS;
    return Math.round(value * factor) / factor;
  },

  clampToGraphQLInt: (value: number): number =>
    Math.min(Math.max(Math.trunc(value), 0), PULSE_GRAPHQL_INT_MAX),

  summarizePresence: (
    presences: readonly PulsePresence[]
  ): PulsePresenceSummary => ({
    weekly: weeklyCountsFromMasks(presences.map((p) => p.weeks)),
    platformsInWindow: presences.filter((p) => p.inWindow).length,
    sectorWeekly: weeklyCountsFromMasks(presences.map((p) => p.sectorWeeks)),
    sectorPlatformsInWindow: presences.filter((p) => p.sectorInWindow).length,
  }),

  // Medians run over every active platform of the population, a platform
  // without any record of a (type, kind) pair counting as 0.
  summarizeBenchmark: ({
    totals,
    callerPlatform,
    kThreshold,
  }: {
    totals: readonly PulsePlatformTotal[];
    callerPlatform: number;
    kThreshold: number;
  }): PulseBenchmarkSummary => {
    const networkPlatforms = new Set(totals.map((row) => row.platform));
    const sectorPlatforms = new Set(
      totals.filter((row) => row.inSector).map((row) => row.platform)
    );
    const byMetric = new Map<
      string,
      { network: Map<number, number>; sector: Map<number, number> }
    >();
    for (const row of totals) {
      const key = metricKey(row.objectType, row.eventKind);
      const entry = byMetric.get(key) ?? {
        network: new Map<number, number>(),
        sector: new Map<number, number>(),
      };
      entry.network.set(row.platform, row.total);
      entry.sector.set(row.platform, row.sectorTotal);
      byMetric.set(key, entry);
    }

    const metrics = PULSE_OBJECT_TYPES.flatMap((objectType) =>
      PULSE_EVENT_KINDS.map((eventKind): PulseBenchmarkMetric => {
        const entry = byMetric.get(metricKey(objectType, eventKind));
        const networkValues = [...networkPlatforms].map(
          (platform) => entry?.network.get(platform) ?? 0
        );
        const sectorValues = [...sectorPlatforms].map(
          (platform) => entry?.sector.get(platform) ?? 0
        );
        const networkMedian =
          networkPlatforms.size >= kThreshold
            ? PulseStats.median(networkValues)
            : null;
        const sectorMedian =
          sectorPlatforms.size >= kThreshold
            ? PulseStats.median(sectorValues)
            : null;
        return {
          object_type: objectType,
          event_kind: eventKind,
          platform_count: PulseStats.clampToGraphQLInt(
            entry?.network.get(callerPlatform) ?? 0
          ),
          sector_median: sectorMedian,
          network_median: networkMedian,
        };
      })
    );

    return {
      metrics,
      sectorPlatforms: sectorPlatforms.size,
      networkPlatforms: networkPlatforms.size,
    };
  },

  // Requests are counted in buckets of `bucketSeconds`; a request may sit
  // anywhere in its bucket, so a bucket counts until its END leaves the
  // rolling window. The oldest buckets leave first, which gives the earliest
  // moment a new request fits.
  decideRateLimit: ({
    buckets,
    nowSeconds,
    windowSeconds,
    bucketSeconds,
    limit,
  }: {
    buckets: readonly PulseRateLimitBucket[];
    nowSeconds: number;
    windowSeconds: number;
    bucketSeconds: number;
    limit: number;
  }): PulseRateLimitDecision => {
    const expiry = (bucket: PulseRateLimitBucket) =>
      bucket.startSeconds + bucketSeconds + windowSeconds;
    const live = buckets
      .filter((bucket) => expiry(bucket) > nowSeconds)
      .sort((a, b) => a.startSeconds - b.startSeconds);
    const used = live.reduce((sum, bucket) => sum + bucket.count, 0);
    if (used < limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    let remaining = used;
    for (const bucket of live) {
      remaining -= bucket.count;
      if (remaining < limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(expiry(bucket) - nowSeconds)
          ),
        };
      }
    }
    return { allowed: false, retryAfterSeconds: windowSeconds };
  },
};
