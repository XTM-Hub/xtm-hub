import {
  PulseEventKind,
  PulseLookupResult,
  PulseObjectType,
} from '../../__generated__/resolvers-types';
import {
  PULSE_EVENT_KINDS,
  PULSE_OBJECT_TYPES,
  PULSE_TRENDING_ITEMS_PER_OBJECT_TYPE,
} from './pulse.const';
import { PulsePresenceSummary, PulseStats } from './pulse.stats.helper';
import {
  PulseAggregateIncrement,
  pulseKeyId,
  PulseKeyRef,
  PulseLedgerRecord,
  PulseSeenRange,
  PulseTotalIncrement,
  PulseTrendingCount,
} from './pulse.types';

export interface PulseBatchAggregation {
  aggregates: PulseAggregateIncrement[];
  keys: PulseKeyRef[];
  totals: PulseTotalIncrement[];
}

export interface PulseRankedTrendingCount extends PulseTrendingCount {
  baseline: number;
  growth: number;
}

const EVENT_KIND_FIELD: Record<
  PulseEventKind,
  'created' | 'sighted' | 'detected' | 'hunted' | 'referenced'
> = {
  [PulseEventKind.Created]: 'created',
  [PulseEventKind.Sighted]: 'sighted',
  [PulseEventKind.Detected]: 'detected',
  [PulseEventKind.Hunted]: 'hunted',
  [PulseEventKind.Referenced]: 'referenced',
};

const compareKeyRefs = (a: PulseKeyRef, b: PulseKeyRef): number =>
  a.k === b.k ? a.t.localeCompare(b.t) : a.k.localeCompare(b.k);

const unpublishedResult = (hash: string): PulseLookupResult => ({
  hash,
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

export const PulseHelper = {
  sortKeyRefs: <T extends PulseKeyRef>(keys: readonly T[]): T[] =>
    [...keys].sort(compareKeyRefs),

  sortLedgerRecords: (
    records: readonly PulseLedgerRecord[]
  ): PulseLedgerRecord[] =>
    [...records].sort((a, b) => compareKeyRefs(a, b) || a.e.localeCompare(b.e)),

  uniqueKeyRefs: (refs: readonly PulseKeyRef[]): PulseKeyRef[] =>
    PulseHelper.sortKeyRefs([
      ...new Map(
        refs.map(({ k, t }) => [pulseKeyId({ k, t }), { k, t }])
      ).values(),
    ]),

  // `existingTupleKeys` holds the keys this platform already reported for the
  // same day and buckets, which must not count it twice in the aggregate.
  aggregateBatch: (
    records: readonly PulseLedgerRecord[],
    existingTupleKeys: ReadonlySet<string>
  ): PulseBatchAggregation => {
    const aggregates = new Map<string, PulseAggregateIncrement>();
    const totals = new Map<string, PulseTotalIncrement>();
    for (const record of records) {
      const keyId = pulseKeyId(record);
      const aggregate = aggregates.get(keyId) ?? {
        k: record.k,
        t: record.t,
        p: existingTupleKeys.has(keyId) ? 0 : 1,
        created: 0,
        sighted: 0,
        detected: 0,
        hunted: 0,
        referenced: 0,
      };
      aggregate[EVENT_KIND_FIELD[record.e]] += record.c;
      aggregates.set(keyId, aggregate);

      const totalId = `${record.t}:${record.e}`;
      const total = totals.get(totalId) ?? { t: record.t, e: record.e, c: 0 };
      total.c += record.c;
      totals.set(totalId, total);
    }
    const sortedAggregates = [...aggregates.values()].sort(compareKeyRefs);
    return {
      aggregates: sortedAggregates,
      keys: sortedAggregates.map(({ k, t }) => ({ k, t })),
      totals: [...totals.values()].sort((a, b) =>
        a.t === b.t
          ? PULSE_EVENT_KINDS.indexOf(a.e) - PULSE_EVENT_KINDS.indexOf(b.e)
          : PULSE_OBJECT_TYPES.indexOf(a.t) - PULSE_OBJECT_TYPES.indexOf(b.t)
      ),
    };
  },

  // Ranked by growth, then recent distinct platforms, then key for a stable
  // order; only the best items of every object type are kept. Every count is
  // coarsened like platforms_bucket first (a period below k weighs 0), so
  // neither the published growth nor the order reveals an exact platform
  // count. PulseDomain.loadTrendingCounts applies the same ranking in SQL.
  rankTrending: (
    counts: readonly PulseTrendingCount[],
    kThreshold: number
  ): PulseRankedTrendingCount[] => {
    const ranked = counts
      .map((count) => {
        const recent = PulseStats.coarseCount(count.recent, kThreshold);
        const prev1 = PulseStats.coarseCount(count.prev1, kThreshold);
        const prev2 = PulseStats.coarseCount(count.prev2, kThreshold);
        const baseline = (prev1 + prev2) / 2;
        return {
          ...count,
          recent,
          prev1,
          prev2,
          baseline,
          growth: PulseStats.growth(recent, baseline),
        };
      })
      .sort(
        (a, b) =>
          b.growth - a.growth || b.recent - a.recent || compareKeyRefs(a, b)
      );
    const keptPerType = new Map<PulseObjectType, number>();
    return ranked.filter((item) => {
      const kept = keptPerType.get(item.t) ?? 0;
      if (kept >= PULSE_TRENDING_ITEMS_PER_OBJECT_TYPE) {
        return false;
      }
      keptPerType.set(item.t, kept + 1);
      return true;
    });
  },

  buildLookupResult: ({
    hash,
    networkPlatforms,
    seen,
    presence,
    activeContributors,
    kThreshold,
  }: {
    hash: string;
    networkPlatforms: number;
    seen: PulseSeenRange | undefined;
    presence: PulsePresenceSummary;
    activeContributors: number;
    kThreshold: number;
  }): PulseLookupResult => {
    if (networkPlatforms < kThreshold || !seen) {
      return unpublishedResult(hash);
    }
    const sectorPublished = presence.sectorPlatformsInWindow >= kThreshold;
    return {
      hash,
      published: true,
      prevalence_bucket: PulseStats.prevalenceBucket({
        platformsInWindow: presence.platformsInWindow,
        activeContributors,
        kThreshold,
      }),
      platforms_bucket: PulseStats.platformsBucket(networkPlatforms),
      first_seen_network: seen.firstSeen,
      last_seen_network: seen.lastSeen,
      trend: PulseStats.weeklyTrend(presence.weekly, kThreshold),
      trend_series: PulseStats.trendSeries(presence.weekly, kThreshold),
      sector_trend: sectorPublished
        ? PulseStats.weeklyTrend(presence.sectorWeekly, kThreshold)
        : null,
      sector_platforms_bucket: sectorPublished
        ? PulseStats.platformsBucket(presence.sectorPlatformsInWindow)
        : null,
    };
  },

  unpublishedResult,
};
