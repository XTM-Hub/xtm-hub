import type { Knex } from 'knex';
import { database } from '../../../knexfile';
import {
  PulseEventKind,
  PulseObjectType,
  PulsePeriod,
  PulseRegionBucket,
  PulseSectorBucket,
} from '../../__generated__/resolvers-types';
import { databaseContext } from '../../context/database.context';
import {
  PULSE_ACTIVITY_WINDOW_DAYS,
  PULSE_DAYS_PER_WEEK,
  PULSE_PLATFORMS_BUCKETS,
  PULSE_TREND_BASELINE_WEEKS,
  PULSE_TREND_SERIES_WEEKS,
} from './pulse.const';
import {
  PulseAggregateIncrement,
  PulseBenchmarkTopItemRow,
  PulseDigestCandidate,
  pulseKeyId,
  PulseKeyPresence,
  PulseKeyRef,
  PulseLedgerRecord,
  PulsePlatformRecord,
  PulsePlatformTotal,
  PulsePublicationPolicy,
  PulseRateLimitBucket,
  PulseSeenRange,
  PulseStoredDigestSnapshot,
  PulseStoredTrendingSnapshot,
  PulseTotalIncrement,
  PulseTrendingCount,
  PulseTrendingSnapshotItem,
} from './pulse.types';

// Raw statements join the ambient transaction (withTransaction /
// withAdvisoryLock) when there is one.
const query = async <T>(
  sql: string,
  bindings: readonly Knex.RawBinding[] = []
): Promise<T[]> => {
  const executor = databaseContext.getTransaction() ?? database;
  const result = await executor.raw<{ rows: T[] }>(sql, bindings);
  return result.rows;
};

const toJson = (value: unknown): string => JSON.stringify(value);

const keyRefsJson = (keys: readonly PulseKeyRef[]): string =>
  toJson(keys.map(({ k, t }) => ({ k, t })));

export const PulseDomain = {
  // region Salts
  loadSalt: async (day: string): Promise<Buffer | undefined> => {
    const [row] = await query<{ salt: Buffer }>(
      'SELECT salt FROM "PulseSalt" WHERE day = ?::date',
      [day]
    );
    return row?.salt;
  },

  insertSaltIfMissing: async (day: string, salt: Buffer): Promise<void> => {
    await query(
      'INSERT INTO "PulseSalt" (day, salt) VALUES (?::date, ?) ON CONFLICT (day) DO NOTHING',
      [day, salt]
    );
  },

  deleteSaltsBefore: async (day: string): Promise<number> => {
    const rows = await query<{ day: string }>(
      'DELETE FROM "PulseSalt" WHERE day < ?::date RETURNING day::text AS day',
      [day]
    );
    return rows.length;
  },
  // endregion

  // region Platforms
  loadPlatformByPseudonym: async (
    pseudonym: string
  ): Promise<PulsePlatformRecord | undefined> => {
    const [row] = await query<PulsePlatformRecord>(
      `SELECT id, sector_bucket, region_bucket,
              first_contribution_day::text AS first_contribution_day,
              last_contribution_day::text AS last_contribution_day
       FROM "PulsePlatform" WHERE pseudonym = decode(?, 'hex')`,
      [pseudonym]
    );
    return row;
  },

  upsertPlatformContribution: async ({
    pseudonym,
    sectorBucket,
    regionBucket,
    day,
  }: {
    pseudonym: string;
    sectorBucket: PulseSectorBucket;
    regionBucket: PulseRegionBucket;
    day: string;
  }): Promise<number> => {
    const [row] = await query<{ id: number }>(
      `INSERT INTO "PulsePlatform" AS p
         (pseudonym, sector_bucket, region_bucket, first_contribution_day, last_contribution_day)
       VALUES (decode(?, 'hex'), ?, ?, ?::date, ?::date)
       ON CONFLICT (pseudonym) DO UPDATE SET
         -- A late batch (an earlier day) never overrides the buckets of a newer one.
         sector_bucket = CASE WHEN p.last_contribution_day IS NULL OR EXCLUDED.last_contribution_day >= p.last_contribution_day
                              THEN EXCLUDED.sector_bucket ELSE p.sector_bucket END,
         region_bucket = CASE WHEN p.last_contribution_day IS NULL OR EXCLUDED.last_contribution_day >= p.last_contribution_day
                              THEN EXCLUDED.region_bucket ELSE p.region_bucket END,
         first_contribution_day = LEAST(p.first_contribution_day, EXCLUDED.first_contribution_day),
         last_contribution_day = GREATEST(p.last_contribution_day, EXCLUDED.last_contribution_day),
         updated_at = now()
       RETURNING id`,
      [pseudonym, sectorBucket, regionBucket, day, day]
    );
    if (!row) {
      throw new Error('Threat Pulse platform record upsert returned no row');
    }
    return row.id;
  },

  countActiveContributors: async ({
    fromDay,
    toDay,
  }: {
    fromDay: string;
    toDay: string;
  }): Promise<number> => {
    const [row] = await query<{ platforms: number }>(
      `SELECT COUNT(DISTINCT pulse_platform_id)::int AS platforms
       FROM "PulsePlatformDailyTotal" WHERE day >= ?::date AND day <= ?::date`,
      [fromDay, toDay]
    );
    return row?.platforms ?? 0;
  },
  // endregion

  // region Contributions
  loadExistingTupleKeys: async ({
    platformId,
    day,
    sectorBucket,
    regionBucket,
    keys,
  }: {
    platformId: number;
    day: string;
    sectorBucket: PulseSectorBucket;
    regionBucket: PulseRegionBucket;
    keys: readonly PulseKeyRef[];
  }): Promise<Set<string>> => {
    const rows = await query<PulseKeyRef>(
      `SELECT DISTINCT encode(c.at_rest_key, 'hex') AS k, c.object_type AS t
       FROM "PulseContribution" c
       JOIN jsonb_to_recordset(?::jsonb) AS r(k text, t text)
         ON c.at_rest_key = decode(r.k, 'hex') AND c.object_type = r.t
       WHERE c.pulse_platform_id = ? AND c.day = ?::date
         AND c.sector_bucket = ? AND c.region_bucket = ?`,
      [keyRefsJson(keys), platformId, day, sectorBucket, regionBucket]
    );
    return new Set(rows.map(pulseKeyId));
  },

  // Every bulk statement processes rows in key order so that concurrent
  // batches lock shared aggregate rows in the same order.
  upsertContributions: async ({
    platformId,
    day,
    sectorBucket,
    regionBucket,
    records,
  }: {
    platformId: number;
    day: string;
    sectorBucket: PulseSectorBucket;
    regionBucket: PulseRegionBucket;
    records: readonly PulseLedgerRecord[];
  }): Promise<void> => {
    await query(
      `INSERT INTO "PulseContribution" AS c
         (pulse_platform_id, day, at_rest_key, object_type, event_kind, sector_bucket, region_bucket, event_count)
       SELECT ?, ?::date, decode(r.k, 'hex'), r.t, r.e, ?, ?, r.c
       FROM jsonb_to_recordset(?::jsonb) AS r(k text, t text, e text, c bigint)
       ORDER BY r.k, r.t, r.e
       ON CONFLICT (pulse_platform_id, day, at_rest_key, object_type, event_kind, sector_bucket, region_bucket)
       DO UPDATE SET event_count = c.event_count + EXCLUDED.event_count, updated_at = now()`,
      [platformId, day, sectorBucket, regionBucket, toJson(records)]
    );
  },

  upsertDailyAggregates: async ({
    day,
    sectorBucket,
    regionBucket,
    increments,
  }: {
    day: string;
    sectorBucket: PulseSectorBucket;
    regionBucket: PulseRegionBucket;
    increments: readonly PulseAggregateIncrement[];
  }): Promise<void> => {
    await query(
      `INSERT INTO "PulseDailyAggregate" AS a
         (at_rest_key, object_type, day, sector_bucket, region_bucket, platform_count,
          created_count, sighted_count, detected_count, hunted_count, referenced_count)
       SELECT decode(r.k, 'hex'), r.t, ?::date, ?, ?, r.p,
              r.created, r.sighted, r.detected, r.hunted, r.referenced
       FROM jsonb_to_recordset(?::jsonb) AS r(
         k text, t text, p int, created bigint, sighted bigint, detected bigint, hunted bigint, referenced bigint)
       ORDER BY r.k, r.t
       ON CONFLICT (at_rest_key, object_type, day, sector_bucket, region_bucket)
       DO UPDATE SET
         platform_count = a.platform_count + EXCLUDED.platform_count,
         created_count = a.created_count + EXCLUDED.created_count,
         sighted_count = a.sighted_count + EXCLUDED.sighted_count,
         detected_count = a.detected_count + EXCLUDED.detected_count,
         hunted_count = a.hunted_count + EXCLUDED.hunted_count,
         referenced_count = a.referenced_count + EXCLUDED.referenced_count,
         updated_at = now()`,
      [day, sectorBucket, regionBucket, toJson(increments)]
    );
  },

  // Returns the keys this platform contributes to for the first time.
  upsertKeyContributors: async ({
    platformId,
    day,
    keys,
  }: {
    platformId: number;
    day: string;
    keys: readonly PulseKeyRef[];
  }): Promise<PulseKeyRef[]> => {
    const rows = await query<PulseKeyRef & { inserted: boolean }>(
      `INSERT INTO "PulseKeyContributor" AS kc (at_rest_key, object_type, pulse_platform_id, last_day)
       SELECT decode(r.k, 'hex'), r.t, ?, ?::date
       FROM jsonb_to_recordset(?::jsonb) AS r(k text, t text)
       ORDER BY r.k, r.t
       ON CONFLICT (at_rest_key, object_type, pulse_platform_id)
       DO UPDATE SET last_day = GREATEST(kc.last_day, EXCLUDED.last_day)
       RETURNING encode(kc.at_rest_key, 'hex') AS k, kc.object_type AS t, (kc.xmax = 0) AS inserted`,
      [platformId, day, keyRefsJson(keys)]
    );
    return rows.filter((row) => row.inserted).map(({ k, t }) => ({ k, t }));
  },

  incrementKeyPlatformCounts: async (
    keys: readonly PulseKeyRef[]
  ): Promise<void> => {
    if (keys.length === 0) {
      return;
    }
    await query(
      `INSERT INTO "PulseKey" AS pk (at_rest_key, object_type, platform_count)
       SELECT decode(r.k, 'hex'), r.t, 1
       FROM jsonb_to_recordset(?::jsonb) AS r(k text, t text)
       ORDER BY r.k, r.t
       ON CONFLICT (at_rest_key, object_type)
       DO UPDATE SET platform_count = pk.platform_count + 1`,
      [keyRefsJson(keys)]
    );
  },

  upsertPlatformDailyTotals: async ({
    platformId,
    day,
    sectorBucket,
    regionBucket,
    totals,
  }: {
    platformId: number;
    day: string;
    sectorBucket: PulseSectorBucket;
    regionBucket: PulseRegionBucket;
    totals: readonly PulseTotalIncrement[];
  }): Promise<void> => {
    await query(
      `INSERT INTO "PulsePlatformDailyTotal" AS pt
         (pulse_platform_id, day, object_type, event_kind, sector_bucket, region_bucket, event_count)
       SELECT ?, ?::date, r.t, r.e, ?, ?, r.c
       FROM jsonb_to_recordset(?::jsonb) AS r(t text, e text, c bigint)
       ORDER BY r.t, r.e
       ON CONFLICT (pulse_platform_id, day, object_type, event_kind, sector_bucket, region_bucket)
       DO UPDATE SET event_count = pt.event_count + EXCLUDED.event_count`,
      [platformId, day, sectorBucket, regionBucket, toJson(totals)]
    );
  },
  // endregion

  // region Key statistics
  countKeyContributors: async ({
    keys,
    sinceDay,
  }: {
    keys: readonly PulseKeyRef[];
    sinceDay: string;
  }): Promise<Map<string, number>> => {
    const rows = await query<PulseKeyRef & { platforms: number }>(
      `SELECT encode(kc.at_rest_key, 'hex') AS k, kc.object_type AS t, COUNT(*)::int AS platforms
       FROM "PulseKeyContributor" kc
       JOIN jsonb_to_recordset(?::jsonb) AS r(k text, t text)
         ON kc.at_rest_key = decode(r.k, 'hex') AND kc.object_type = r.t
       WHERE kc.last_day >= ?::date
       GROUP BY kc.at_rest_key, kc.object_type`,
      [keyRefsJson(keys), sinceDay]
    );
    return new Map(rows.map((row) => [pulseKeyId(row), row.platforms]));
  },

  countKeyPlatformsInWindow: async ({
    keys,
    fromDay,
    toDay,
  }: {
    keys: readonly PulseKeyRef[];
    fromDay: string;
    toDay: string;
  }): Promise<Map<string, number>> => {
    const rows = await query<PulseKeyRef & { platforms: number }>(
      `SELECT encode(c.at_rest_key, 'hex') AS k, c.object_type AS t,
              COUNT(DISTINCT c.pulse_platform_id)::int AS platforms
       FROM "PulseContribution" c
       JOIN jsonb_to_recordset(?::jsonb) AS r(k text, t text)
         ON c.at_rest_key = decode(r.k, 'hex') AND c.object_type = r.t
       WHERE c.day >= ?::date AND c.day <= ?::date
       GROUP BY c.at_rest_key, c.object_type`,
      [keyRefsJson(keys), fromDay, toDay]
    );
    return new Map(rows.map((row) => [pulseKeyId(row), row.platforms]));
  },

  // First and last day of the key over the weeks (counted back from `day`,
  // like the trend series) that k distinct platforms reached: a day of a
  // week below k is published nowhere else, so it never bounds the range.
  loadSeenRanges: async ({
    keys,
    sinceDay,
    day,
    kThreshold,
  }: {
    keys: readonly PulseKeyRef[];
    sinceDay: string;
    day: string;
    kThreshold: number;
  }): Promise<Map<string, PulseSeenRange>> => {
    const rows = await query<
      PulseKeyRef & { first_seen: string; last_seen: string }
    >(
      `WITH weekly AS (
         SELECT c.at_rest_key, c.object_type,
                COUNT(DISTINCT c.pulse_platform_id) AS platforms,
                MIN(c.day) AS first_day, MAX(c.day) AS last_day
         FROM "PulseContribution" c
         JOIN jsonb_to_recordset(?::jsonb) AS r(k text, t text)
           ON c.at_rest_key = decode(r.k, 'hex') AND c.object_type = r.t
         WHERE c.day >= ?::date AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type, (?::date - c.day) / ?::int
       )
       SELECT encode(at_rest_key, 'hex') AS k, object_type AS t,
              MIN(first_day)::text AS first_seen, MAX(last_day)::text AS last_seen
       FROM weekly
       WHERE platforms >= ?
       GROUP BY at_rest_key, object_type`,
      [keyRefsJson(keys), sinceDay, day, day, PULSE_DAYS_PER_WEEK, kThreshold]
    );
    return new Map(
      rows.map((row) => [
        pulseKeyId(row),
        { firstSeen: row.first_seen, lastSeen: row.last_seen },
      ])
    );
  },

  // One row per (key, platform) over the 12 weeks ending on `day`, with the
  // week bitmasks and the 30-day flags for the network and the sector.
  loadKeyPresence: async ({
    keys,
    day,
    sectorBucket,
  }: {
    keys: readonly PulseKeyRef[];
    day: string;
    sectorBucket: PulseSectorBucket;
  }): Promise<PulseKeyPresence[]> => {
    const rows = await query<
      PulseKeyRef & {
        weeks: number;
        in_window: boolean;
        sector_weeks: number;
        sector_in_window: boolean;
      }
    >(
      `SELECT encode(c.at_rest_key, 'hex') AS k, c.object_type AS t,
              bit_or(1 << ((?::date - c.day) / ?::int)) AS weeks,
              bool_or(c.day > ?::date - ?::int) AS in_window,
              bit_or(CASE WHEN c.sector_bucket = ? THEN 1 << ((?::date - c.day) / ?::int) ELSE 0 END) AS sector_weeks,
              bool_or(c.sector_bucket = ? AND c.day > ?::date - ?::int) AS sector_in_window
       FROM "PulseContribution" c
       JOIN jsonb_to_recordset(?::jsonb) AS r(k text, t text)
         ON c.at_rest_key = decode(r.k, 'hex') AND c.object_type = r.t
       WHERE c.day > ?::date - ?::int AND c.day <= ?::date
       GROUP BY c.at_rest_key, c.object_type, c.pulse_platform_id`,
      [
        day,
        PULSE_DAYS_PER_WEEK,
        day,
        PULSE_ACTIVITY_WINDOW_DAYS,
        sectorBucket,
        day,
        PULSE_DAYS_PER_WEEK,
        sectorBucket,
        day,
        PULSE_ACTIVITY_WINDOW_DAYS,
        keyRefsJson(keys),
        day,
        PULSE_TREND_SERIES_WEEKS * PULSE_DAYS_PER_WEEK,
        day,
      ]
    );
    return rows.map((row) => ({
      k: row.k,
      t: row.t,
      weeks: row.weeks,
      inWindow: row.in_window,
      sectorWeeks: row.sector_weeks,
      sectorInWindow: row.sector_in_window,
    }));
  },
  // endregion

  // region Trending
  // Distinct platforms of the bucket over the period and the two previous
  // periods, raw, for every key published network-wide that reaches k in the
  // period. The ranking of PulseHelper.rankTrending (on the counts coarsened
  // like platforms_bucket, 0 below k) and its per-type limit run in the
  // database, so a large network never materializes every candidate in the
  // API process; the counts stay raw so PulseHelper.rankTrending coarsens
  // them exactly once.
  loadTrendingCounts: async ({
    day,
    periodDays,
    sectorBucket,
    regionBucket,
    kThreshold,
    retentionStart,
    limitPerObjectType,
  }: {
    day: string;
    periodDays: number;
    sectorBucket: PulseSectorBucket | null;
    regionBucket: PulseRegionBucket | null;
    kThreshold: number;
    retentionStart: string;
    limitPerObjectType: number;
  }): Promise<PulseTrendingCount[]> =>
    query<PulseTrendingCount>(
      `WITH presence AS (
         SELECT c.at_rest_key, c.object_type, c.pulse_platform_id,
                bool_or(c.day > ?::date - ?::int) AS in_recent,
                bool_or(c.day <= ?::date - ?::int AND c.day > ?::date - ?::int) AS in_prev1,
                bool_or(c.day <= ?::date - ?::int) AS in_prev2
         FROM "PulseContribution" c
         JOIN "PulseKey" pk ON pk.at_rest_key = c.at_rest_key AND pk.object_type = c.object_type
         WHERE pk.platform_count >= ?
           AND c.day > ?::date - ?::int AND c.day <= ?::date
           AND (?::text IS NULL OR c.sector_bucket = ?::text)
           AND (?::text IS NULL OR c.region_bucket = ?::text)
         GROUP BY c.at_rest_key, c.object_type, c.pulse_platform_id
       ),
       counts AS (
         SELECT at_rest_key, object_type,
                COUNT(*) FILTER (WHERE in_recent)::int AS recent,
                COUNT(*) FILTER (WHERE in_prev1)::int AS prev1,
                COUNT(*) FILTER (WHERE in_prev2)::int AS prev2
         FROM presence
         GROUP BY at_rest_key, object_type
         HAVING COUNT(*) FILTER (WHERE in_recent) >= ?
       ),
       eligible AS (
         SELECT counts.* FROM counts
         WHERE (
           SELECT COUNT(*) FROM "PulseKeyContributor" kc
           WHERE kc.at_rest_key = counts.at_rest_key AND kc.object_type = counts.object_type
             AND kc.last_day >= ?::date
         ) >= ?
       ),
       buckets AS (
         SELECT value::int AS min FROM jsonb_array_elements_text(?::jsonb)
       ),
       coarse AS (
         SELECT e.at_rest_key, e.object_type, e.recent, e.prev1, e.prev2,
                CASE WHEN e.recent >= ? THEN COALESCE((SELECT MAX(b.min) FROM buckets b WHERE b.min <= e.recent), 0) ELSE 0 END AS coarse_recent,
                CASE WHEN e.prev1 >= ? THEN COALESCE((SELECT MAX(b.min) FROM buckets b WHERE b.min <= e.prev1), 0) ELSE 0 END AS coarse_prev1,
                CASE WHEN e.prev2 >= ? THEN COALESCE((SELECT MAX(b.min) FROM buckets b WHERE b.min <= e.prev2), 0) ELSE 0 END AS coarse_prev2
         FROM eligible e
       ),
       ranked AS (
         SELECT coarse.*,
                ROW_NUMBER() OVER (
                  PARTITION BY object_type
                  ORDER BY (coarse_recent + 1)::float8 / ((coarse_prev1 + coarse_prev2) / 2.0 + 1) DESC, coarse_recent DESC, at_rest_key
                ) AS position
         FROM coarse
       )
       SELECT encode(at_rest_key, 'hex') AS k, object_type AS t, recent, prev1, prev2
       FROM ranked
       WHERE position <= ?
       ORDER BY object_type, position`,
      [
        day,
        periodDays,
        day,
        periodDays,
        day,
        2 * periodDays,
        day,
        2 * periodDays,
        kThreshold,
        day,
        3 * periodDays,
        day,
        sectorBucket,
        sectorBucket,
        regionBucket,
        regionBucket,
        kThreshold,
        retentionStart,
        kThreshold,
        toJson(PULSE_PLATFORMS_BUCKETS.map((bucket) => bucket.min)),
        kThreshold,
        kThreshold,
        kThreshold,
        limitPerObjectType,
      ]
    ),

  loadTrendingSnapshot: async ({
    day,
    period,
    sectorScope,
    regionScope,
  }: {
    day: string;
    period: PulsePeriod;
    sectorScope: string;
    regionScope: string;
  }): Promise<
    | {
        computedAt: Date;
        policy: PulsePublicationPolicy | null;
        items: PulseTrendingSnapshotItem[];
      }
    | undefined
  > => {
    const [row] = await query<{
      computed_at: Date;
      items: PulseStoredTrendingSnapshot | unknown;
    }>(
      `SELECT computed_at, items FROM "PulseTrendingSnapshot"
       WHERE day = ?::date AND period = ? AND sector_scope = ? AND region_scope = ?`,
      [day, period, sectorScope, regionScope]
    );
    if (!row) {
      return undefined;
    }
    // A snapshot written before the publication policy was stored has none:
    // it never matches, so it is recomputed.
    const stored = row.items as Partial<PulseStoredTrendingSnapshot> | null;
    const isStored =
      !!stored && !Array.isArray(stored) && Array.isArray(stored.items);
    return {
      computedAt: row.computed_at,
      policy: isStored ? (stored.policy ?? null) : null,
      items: isStored ? (stored.items ?? []) : [],
    };
  },

  saveTrendingSnapshot: async ({
    day,
    period,
    sectorScope,
    regionScope,
    computedAt,
    policy,
    items,
  }: {
    day: string;
    period: PulsePeriod;
    sectorScope: string;
    regionScope: string;
    computedAt: Date;
    policy: PulsePublicationPolicy;
    items: readonly PulseTrendingSnapshotItem[];
  }): Promise<void> => {
    const stored: PulseStoredTrendingSnapshot = { policy, items: [...items] };
    await query(
      `INSERT INTO "PulseTrendingSnapshot" (day, period, sector_scope, region_scope, computed_at, items)
       VALUES (?::date, ?, ?, ?, to_timestamp(?::float8 / 1000), ?::jsonb)
       ON CONFLICT (day, period, sector_scope, region_scope)
       DO UPDATE SET computed_at = EXCLUDED.computed_at, items = EXCLUDED.items`,
      [
        day,
        period,
        sectorScope,
        regionScope,
        computedAt.getTime(),
        toJson(stored),
      ]
    );
  },

  deleteTrendingSnapshots: async (): Promise<void> => {
    await query('DELETE FROM "PulseTrendingSnapshot"');
  },
  // endregion

  // region Digest
  // The `limit` keys of the network that the most distinct platforms reported
  // over the activity window, k at least, with their distinct platforms per
  // week over the trend baseline (newest week first).
  loadDigestCandidates: async ({
    day,
    kThreshold,
    limit,
  }: {
    day: string;
    kThreshold: number;
    limit: number;
  }): Promise<PulseDigestCandidate[]> => {
    const weeks = PULSE_TREND_BASELINE_WEEKS + 1;
    const rows = await query<
      PulseKeyRef & { in_window: number; weeks: [number, number][] }
    >(
      `WITH top AS (
         SELECT c.at_rest_key, c.object_type,
                COUNT(DISTINCT c.pulse_platform_id)::int AS in_window
         FROM "PulseContribution" c
         WHERE c.day > ?::date - ?::int AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type
         HAVING COUNT(DISTINCT c.pulse_platform_id) >= ?
         ORDER BY in_window DESC, c.at_rest_key, c.object_type
         LIMIT ?
       ),
       weekly AS (
         SELECT c.at_rest_key, c.object_type,
                ((?::date - c.day) / ?::int)::int AS week,
                COUNT(DISTINCT c.pulse_platform_id)::int AS platforms
         FROM "PulseContribution" c
         JOIN top ON top.at_rest_key = c.at_rest_key AND top.object_type = c.object_type
         WHERE c.day > ?::date - ?::int AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type, week
       )
       SELECT encode(top.at_rest_key, 'hex') AS k, top.object_type AS t, top.in_window,
              COALESCE(
                jsonb_agg(jsonb_build_array(w.week, w.platforms)) FILTER (WHERE w.week IS NOT NULL),
                '[]'::jsonb
              ) AS weeks
       FROM top
       LEFT JOIN weekly w ON w.at_rest_key = top.at_rest_key AND w.object_type = top.object_type
       GROUP BY top.at_rest_key, top.object_type, top.in_window
       ORDER BY top.in_window DESC, top.at_rest_key, top.object_type`,
      [
        day,
        PULSE_ACTIVITY_WINDOW_DAYS,
        day,
        kThreshold,
        limit,
        day,
        PULSE_DAYS_PER_WEEK,
        day,
        weeks * PULSE_DAYS_PER_WEEK,
        day,
      ]
    );
    return rows.map((row) => {
      const weekly = Array.from({ length: weeks }, () => 0);
      for (const [week, platforms] of row.weeks) {
        if (week >= 0 && week < weeks) {
          weekly[week] = platforms;
        }
      }
      return { k: row.k, t: row.t, platformsInWindow: row.in_window, weekly };
    });
  },

  loadDigestSnapshot: async (
    day: string
  ): Promise<
    { computedAt: Date; stored: PulseStoredDigestSnapshot | null } | undefined
  > => {
    const [row] = await query<{ computed_at: Date; items: unknown }>(
      `SELECT computed_at, items FROM "PulseDigestSnapshot" WHERE day = ?::date`,
      [day]
    );
    if (!row) {
      return undefined;
    }
    const stored = row.items as Partial<PulseStoredDigestSnapshot> | null;
    const isStored =
      !!stored &&
      !!stored.policy &&
      typeof stored.size === 'number' &&
      Array.isArray(stored.items);
    return {
      computedAt: row.computed_at,
      stored: isStored ? (stored as PulseStoredDigestSnapshot) : null,
    };
  },

  saveDigestSnapshot: async ({
    day,
    computedAt,
    stored,
  }: {
    day: string;
    computedAt: Date;
    stored: PulseStoredDigestSnapshot;
  }): Promise<void> => {
    await query(
      `INSERT INTO "PulseDigestSnapshot" (day, computed_at, items)
       VALUES (?::date, to_timestamp(?::float8 / 1000), ?::jsonb)
       ON CONFLICT (day)
       DO UPDATE SET computed_at = EXCLUDED.computed_at, items = EXCLUDED.items`,
      [day, computedAt.getTime(), toJson(stored)]
    );
  },

  deleteDigestSnapshots: async (): Promise<void> => {
    await query('DELETE FROM "PulseDigestSnapshot"');
  },
  // endregion

  // region Benchmark
  loadPlatformTotals: async ({
    fromDay,
    toDay,
    sectorBucket,
  }: {
    fromDay: string;
    toDay: string;
    sectorBucket: PulseSectorBucket;
  }): Promise<PulsePlatformTotal[]> => {
    const rows = await query<{
      platform: number;
      t: PulseObjectType;
      e: PulseEventKind;
      total: number;
      sector_total: number;
      in_sector: boolean;
    }>(
      `SELECT pulse_platform_id AS platform, object_type AS t, event_kind AS e,
              SUM(event_count)::float8 AS total,
              COALESCE(SUM(event_count) FILTER (WHERE sector_bucket = ?), 0)::float8 AS sector_total,
              bool_or(sector_bucket = ?) AS in_sector
       FROM "PulsePlatformDailyTotal"
       WHERE day >= ?::date AND day <= ?::date
       GROUP BY pulse_platform_id, object_type, event_kind`,
      [sectorBucket, sectorBucket, fromDay, toDay]
    );
    return rows.map((row) => ({
      platform: row.platform,
      objectType: row.t,
      eventKind: row.e,
      total: row.total,
      sectorTotal: row.sector_total,
      inSector: row.in_sector,
    }));
  },

  // Keys of the caller published in its sector over the period where the
  // caller is above the median of the per-platform sums of the sector
  // platforms, strongest relative outliers first.
  loadBenchmarkTopItems: async ({
    platformId,
    fromDay,
    toDay,
    sectorBucket,
    kThreshold,
    limit,
  }: {
    platformId: number;
    fromDay: string;
    toDay: string;
    sectorBucket: PulseSectorBucket;
    kThreshold: number;
    limit: number;
  }): Promise<PulseBenchmarkTopItemRow[]> => {
    const rows = await query<
      PulseKeyRef & { my_count: number; median: number }
    >(
      `WITH mine AS (
         SELECT c.at_rest_key, c.object_type, SUM(c.event_count)::float8 AS my_count
         FROM "PulseContribution" c
         JOIN "PulseKey" pk ON pk.at_rest_key = c.at_rest_key AND pk.object_type = c.object_type
         WHERE pk.platform_count >= ? AND c.pulse_platform_id = ?
           AND c.day >= ?::date AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type
       ),
       per_platform AS (
         SELECT c.at_rest_key, c.object_type, c.pulse_platform_id, SUM(c.event_count)::float8 AS total
         FROM "PulseContribution" c
         JOIN mine m ON m.at_rest_key = c.at_rest_key AND m.object_type = c.object_type
         WHERE c.sector_bucket = ? AND c.day >= ?::date AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type, c.pulse_platform_id
       ),
       stats AS (
         SELECT at_rest_key, object_type,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY total) AS median
         FROM per_platform
         GROUP BY at_rest_key, object_type
         HAVING COUNT(*) >= ?
       )
       SELECT encode(m.at_rest_key, 'hex') AS k, m.object_type AS t, m.my_count, s.median
       FROM mine m
       JOIN stats s ON s.at_rest_key = m.at_rest_key AND s.object_type = m.object_type
       WHERE s.median > 0 AND m.my_count > s.median
       ORDER BY m.my_count / s.median DESC, m.my_count DESC, m.at_rest_key, m.object_type
       LIMIT ?`,
      [
        kThreshold,
        platformId,
        fromDay,
        toDay,
        sectorBucket,
        fromDay,
        toDay,
        kThreshold,
        limit,
      ]
    );
    return rows.map((row) => ({
      k: row.k,
      t: row.t,
      myCount: row.my_count,
      median: row.median,
    }));
  },
  // endregion

  // region Rate limits
  loadRateLimitBuckets: async ({
    pseudonym,
    operation,
    sinceSeconds,
  }: {
    pseudonym: string;
    operation: string;
    sinceSeconds: number;
  }): Promise<PulseRateLimitBucket[]> => {
    const rows = await query<{ start_seconds: string; count: number }>(
      `SELECT EXTRACT(EPOCH FROM bucket_start)::bigint::text AS start_seconds, request_count AS count
       FROM "PulseRateLimit"
       WHERE pseudonym = decode(?, 'hex') AND operation = ? AND bucket_start > to_timestamp(?)`,
      [pseudonym, operation, sinceSeconds]
    );
    return rows.map((row) => ({
      startSeconds: Number(row.start_seconds),
      count: row.count,
    }));
  },

  incrementRateLimitBucket: async ({
    pseudonym,
    operation,
    bucketStartSeconds,
  }: {
    pseudonym: string;
    operation: string;
    bucketStartSeconds: number;
  }): Promise<void> => {
    await query(
      `INSERT INTO "PulseRateLimit" AS rl (pseudonym, operation, bucket_start, request_count)
       VALUES (decode(?, 'hex'), ?, to_timestamp(?), 1)
       ON CONFLICT (pseudonym, operation, bucket_start)
       DO UPDATE SET request_count = rl.request_count + 1`,
      [pseudonym, operation, bucketStartSeconds]
    );
  },

  deleteRateLimitBucketsBefore: async (
    beforeSeconds: number
  ): Promise<number> => {
    const rows = await query<{ operation: string }>(
      'DELETE FROM "PulseRateLimit" WHERE bucket_start < to_timestamp(?) RETURNING operation',
      [beforeSeconds]
    );
    return rows.length;
  },
  // endregion

  // region Purge
  loadOldestContributionDay: async (
    platformId: number
  ): Promise<string | undefined> => {
    const [row] = await query<{ day: string | null }>(
      'SELECT MIN(day)::text AS day FROM "PulseContribution" WHERE pulse_platform_id = ?',
      [platformId]
    );
    return row?.day ?? undefined;
  },

  // Removes the platform's ledger rows of one day and takes them out of the
  // daily aggregates in the same statement, so aggregates always match the
  // ledger.
  purgeContributionDay: async ({
    platformId,
    day,
  }: {
    platformId: number;
    day: string;
  }): Promise<number> => {
    const [row] = await query<{ deleted: number }>(
      `WITH removed AS (
         DELETE FROM "PulseContribution"
         WHERE pulse_platform_id = ? AND day = ?::date
         RETURNING at_rest_key, object_type, event_kind, sector_bucket, region_bucket, event_count
       ),
       per_tuple AS (
         SELECT at_rest_key, object_type, sector_bucket, region_bucket,
                COALESCE(SUM(event_count) FILTER (WHERE event_kind = ?), 0) AS created,
                COALESCE(SUM(event_count) FILTER (WHERE event_kind = ?), 0) AS sighted,
                COALESCE(SUM(event_count) FILTER (WHERE event_kind = ?), 0) AS detected,
                COALESCE(SUM(event_count) FILTER (WHERE event_kind = ?), 0) AS hunted,
                COALESCE(SUM(event_count) FILTER (WHERE event_kind = ?), 0) AS referenced
         FROM removed
         GROUP BY at_rest_key, object_type, sector_bucket, region_bucket
       ),
       updated AS (
         UPDATE "PulseDailyAggregate" a SET
           platform_count = GREATEST(a.platform_count - 1, 0),
           created_count = GREATEST(a.created_count - t.created, 0),
           sighted_count = GREATEST(a.sighted_count - t.sighted, 0),
           detected_count = GREATEST(a.detected_count - t.detected, 0),
           hunted_count = GREATEST(a.hunted_count - t.hunted, 0),
           referenced_count = GREATEST(a.referenced_count - t.referenced, 0),
           updated_at = now()
         FROM per_tuple t
         WHERE a.at_rest_key = t.at_rest_key AND a.object_type = t.object_type AND a.day = ?::date
           AND a.sector_bucket = t.sector_bucket AND a.region_bucket = t.region_bucket
         RETURNING a.at_rest_key
       )
       SELECT (SELECT COUNT(*) FROM removed)::int AS deleted`,
      [
        platformId,
        day,
        PulseEventKind.Created,
        PulseEventKind.Sighted,
        PulseEventKind.Detected,
        PulseEventKind.Hunted,
        PulseEventKind.Referenced,
        day,
      ]
    );
    await query(
      'DELETE FROM "PulseDailyAggregate" WHERE day = ?::date AND platform_count <= 0',
      [day]
    );
    return row?.deleted ?? 0;
  },

  purgeKeyContributorsBatch: async ({
    platformId,
    batchSize,
  }: {
    platformId: number;
    batchSize: number;
  }): Promise<number> => {
    const [row] = await query<{ removed: number }>(
      `WITH removed AS (
         DELETE FROM "PulseKeyContributor"
         WHERE ctid IN (
           SELECT ctid FROM "PulseKeyContributor" WHERE pulse_platform_id = ? LIMIT ?
         )
         RETURNING at_rest_key, object_type
       ),
       updated AS (
         UPDATE "PulseKey" pk SET platform_count = GREATEST(pk.platform_count - r.removed, 0)
         FROM (
           SELECT at_rest_key, object_type, COUNT(*)::int AS removed
           FROM removed GROUP BY at_rest_key, object_type
         ) r
         WHERE pk.at_rest_key = r.at_rest_key AND pk.object_type = r.object_type
         RETURNING pk.at_rest_key
       )
       SELECT (SELECT COUNT(*) FROM removed)::int AS removed`,
      [platformId, batchSize]
    );
    await PulseDomain.deleteUnpublishedKeys();
    return row?.removed ?? 0;
  },

  deleteUnpublishedKeys: async (): Promise<void> => {
    await query('DELETE FROM "PulseKey" WHERE platform_count <= 0');
  },

  countPlatformContributions: async (platformId: number): Promise<number> => {
    const [row] = await query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM "PulseContribution" WHERE pulse_platform_id = ?',
      [platformId]
    );
    return row?.total ?? 0;
  },

  deletePlatform: async (platformId: number): Promise<void> => {
    await query('DELETE FROM "PulsePlatform" WHERE id = ?', [platformId]);
  },
  // endregion

  // region Retention
  deleteRowsBeforeDay: async ({
    table,
    day,
    batchSize,
  }: {
    table:
      'PulseContribution' | 'PulseDailyAggregate' | 'PulsePlatformDailyTotal';
    day: string;
    batchSize: number;
  }): Promise<number> => {
    const [row] = await query<{ deleted: number }>(
      `WITH removed AS (
         DELETE FROM ?? WHERE ctid IN (SELECT ctid FROM ?? WHERE day < ?::date LIMIT ?)
         RETURNING 1
       )
       SELECT COUNT(*)::int AS deleted FROM removed`,
      [table, table, day, batchSize]
    );
    return row?.deleted ?? 0;
  },

  deleteKeyContributorsBefore: async ({
    day,
    batchSize,
  }: {
    day: string;
    batchSize: number;
  }): Promise<number> => {
    const [row] = await query<{ removed: number }>(
      `WITH removed AS (
         DELETE FROM "PulseKeyContributor"
         WHERE ctid IN (
           SELECT ctid FROM "PulseKeyContributor" WHERE last_day < ?::date LIMIT ?
         )
         RETURNING at_rest_key, object_type
       ),
       updated AS (
         UPDATE "PulseKey" pk SET platform_count = GREATEST(pk.platform_count - r.removed, 0)
         FROM (
           SELECT at_rest_key, object_type, COUNT(*)::int AS removed
           FROM removed GROUP BY at_rest_key, object_type
         ) r
         WHERE pk.at_rest_key = r.at_rest_key AND pk.object_type = r.object_type
         RETURNING pk.at_rest_key
       )
       SELECT (SELECT COUNT(*) FROM removed)::int AS removed`,
      [day, batchSize]
    );
    return row?.removed ?? 0;
  },

  deleteInactivePlatforms: async (day: string): Promise<number> => {
    const rows = await query<{ id: number }>(
      'DELETE FROM "PulsePlatform" WHERE last_contribution_day < ?::date RETURNING id',
      [day]
    );
    return rows.length;
  },

  // After retention the first contribution day of a platform is the oldest
  // day still held for it.
  refreshFirstContributionDays: async (day: string): Promise<void> => {
    await query(
      `UPDATE "PulsePlatform" p SET first_contribution_day = m.first_day, updated_at = now()
       FROM (
         SELECT pulse_platform_id, MIN(day) AS first_day
         FROM "PulsePlatformDailyTotal" GROUP BY pulse_platform_id
       ) m
       WHERE p.id = m.pulse_platform_id AND p.first_contribution_day < ?::date`,
      [day]
    );
  },
  // endregion
};
