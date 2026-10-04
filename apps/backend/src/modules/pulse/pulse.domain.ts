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
  PulseBenchmarkMetrics,
  PulseBenchmarkTopItemRow,
  PulseDigestCandidate,
  pulseKeyId,
  PulseKeyPresence,
  PulseKeyRef,
  PulseLedgerRecord,
  PulsePlatformRecord,
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

const CURRENT_DATA_GENERATION =
  'COALESCE((SELECT generation FROM "PulseDataGeneration" WHERE id = 1), 0)';

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

  // region Batches
  // The receipt of a batch, written in the transaction of its counts.
  recordBatch: async ({
    pseudonym,
    batchId,
    day,
    accepted,
  }: {
    pseudonym: string;
    batchId: string;
    day: string;
    accepted: number;
  }): Promise<void> => {
    await query(
      `INSERT INTO "PulseBatch" (pseudonym, batch_id, day, accepted)
       VALUES (decode(?, 'hex'), ?::uuid, ?::date, ?)
       ON CONFLICT (pseudonym, batch_id) DO NOTHING`,
      [pseudonym, batchId, day, accepted]
    );
  },

  // The day and the number of records of the batch when the platform first
  // pushed it, if it did.
  loadBatchReceipt: async ({
    pseudonym,
    batchId,
  }: {
    pseudonym: string;
    batchId: string;
  }): Promise<{ accepted: number; day: string } | undefined> => {
    const [row] = await query<{ accepted: number; day: string }>(
      `SELECT accepted, day::text AS day FROM "PulseBatch"
       WHERE pseudonym = decode(?, 'hex') AND batch_id = ?::uuid`,
      [pseudonym, batchId]
    );
    return row;
  },

  // A purge keeps the receipts, so that a batch accepted before it records
  // nothing when retried, but not what they counted.
  forgetBatchCounts: async (pseudonym: string): Promise<void> => {
    await query(
      `UPDATE "PulseBatch" SET accepted = 0 WHERE pseudonym = decode(?, 'hex')`,
      [pseudonym]
    );
  },

  deleteBatchesBefore: async (day: string): Promise<number> => {
    const rows = await query<{ batch_id: string }>(
      'DELETE FROM "PulseBatch" WHERE day < ?::date RETURNING batch_id::text AS batch_id',
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

  // First and last seen days of the key over the weeks (counted back from
  // `day`, like the trend series) that k distinct platforms reached, published
  // as week boundaries: the first day of the oldest of those weeks (never
  // before `sinceDay`) and the last day of the newest one. A week below k is
  // published nowhere else, so it never bounds the range, and a day inside a
  // qualifying week may hold a single platform, so no contribution day is
  // ever published as such.
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
                (?::date - c.day) / ?::int AS week,
                COUNT(DISTINCT c.pulse_platform_id) AS platforms
         FROM "PulseContribution" c
         JOIN jsonb_to_recordset(?::jsonb) AS r(k text, t text)
           ON c.at_rest_key = decode(r.k, 'hex') AND c.object_type = r.t
         WHERE c.day >= ?::date AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type, week
       )
       SELECT encode(at_rest_key, 'hex') AS k, object_type AS t,
              GREATEST(?::date - (MAX(week) * ?::int + ?::int - 1), ?::date)::text AS first_seen,
              (?::date - MIN(week) * ?::int)::text AS last_seen
       FROM weekly
       WHERE platforms >= ?
       GROUP BY at_rest_key, object_type`,
      [
        day,
        PULSE_DAYS_PER_WEEK,
        keyRefsJson(keys),
        sinceDay,
        day,
        day,
        PULSE_DAYS_PER_WEEK,
        PULSE_DAYS_PER_WEEK,
        sinceDay,
        day,
        PULSE_DAYS_PER_WEEK,
        kThreshold,
      ]
    );
    return new Map(
      rows.map((row) => [
        pulseKeyId(row),
        { firstSeen: row.first_seen, lastSeen: row.last_seen },
      ])
    );
  },

  // One row per key over the 12 weeks ending on `day`: the distinct platforms
  // of each week (newest first) and of the 30-day window, for the network and
  // for the sector. Summarized in the database, so a lookup transfers at most
  // one row per requested key whatever the number of reporting platforms.
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
        weekly: number[];
        in_window: number;
        sector_weekly: number[];
        sector_in_window: number;
      }
    >(
      `WITH presence AS (
         SELECT c.at_rest_key, c.object_type,
                bit_or(1 << ((?::date - c.day) / ?::int)) AS weeks,
                bool_or(c.day > ?::date - ?::int) AS in_window,
                bit_or(CASE WHEN c.sector_bucket = ? THEN 1 << ((?::date - c.day) / ?::int) ELSE 0 END) AS sector_weeks,
                bool_or(c.sector_bucket = ? AND c.day > ?::date - ?::int) AS sector_in_window
         FROM "PulseContribution" c
         JOIN jsonb_to_recordset(?::jsonb) AS r(k text, t text)
           ON c.at_rest_key = decode(r.k, 'hex') AND c.object_type = r.t
         WHERE c.day > ?::date - ?::int AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type, c.pulse_platform_id
       ),
       weekly AS (
         SELECT p.at_rest_key, p.object_type, w.week,
                COUNT(*) FILTER (WHERE (p.weeks & (1 << w.week)) <> 0) AS platforms,
                COUNT(*) FILTER (WHERE (p.sector_weeks & (1 << w.week)) <> 0) AS sector_platforms
         FROM presence p
         CROSS JOIN generate_series(0, ?::int - 1) AS w(week)
         GROUP BY p.at_rest_key, p.object_type, w.week
       ),
       series AS (
         SELECT at_rest_key, object_type,
                jsonb_agg(platforms ORDER BY week) AS weekly,
                jsonb_agg(sector_platforms ORDER BY week) AS sector_weekly
         FROM weekly
         GROUP BY at_rest_key, object_type
       ),
       windows AS (
         SELECT at_rest_key, object_type,
                (COUNT(*) FILTER (WHERE in_window))::int AS in_window,
                (COUNT(*) FILTER (WHERE sector_in_window))::int AS sector_in_window
         FROM presence
         GROUP BY at_rest_key, object_type
       )
       SELECT encode(s.at_rest_key, 'hex') AS k, s.object_type AS t,
              s.weekly, w.in_window, s.sector_weekly, w.sector_in_window
       FROM series s
       JOIN windows w ON w.at_rest_key = s.at_rest_key AND w.object_type = s.object_type`,
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
        PULSE_TREND_SERIES_WEEKS,
      ]
    );
    return rows.map((row) => ({
      k: row.k,
      t: row.t,
      weekly: row.weekly,
      platformsInWindow: row.in_window,
      sectorWeekly: row.sector_weekly,
      sectorPlatformsInWindow: row.sector_in_window,
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
                CASE WHEN e.recent >= ? THEN COALESCE((SELECT MAX(b.min) FROM buckets b WHERE b.min <= e.recent), ?) ELSE 0 END AS coarse_recent,
                CASE WHEN e.prev1 >= ? THEN COALESCE((SELECT MAX(b.min) FROM buckets b WHERE b.min <= e.prev1), ?) ELSE 0 END AS coarse_prev1,
                CASE WHEN e.prev2 >= ? THEN COALESCE((SELECT MAX(b.min) FROM buckets b WHERE b.min <= e.prev2), ?) ELSE 0 END AS coarse_prev2
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
        // Each coarse count: the k it starts at, then its value below the
        // smallest bucket (the "<5" range starting at k).
        kThreshold,
        kThreshold,
        kThreshold,
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
        generation: number | null;
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
      generation: isStored ? (stored.generation ?? null) : null,
      items: isStored ? (stored.items ?? []) : [],
    };
  },

  // Saved only while `generation` is still the current data generation: a
  // computation that read the data before a purge or a retention run finished
  // never publishes its result.
  saveTrendingSnapshot: async ({
    day,
    period,
    sectorScope,
    regionScope,
    computedAt,
    policy,
    generation,
    items,
  }: {
    day: string;
    period: PulsePeriod;
    sectorScope: string;
    regionScope: string;
    computedAt: Date;
    policy: PulsePublicationPolicy;
    generation: number;
    items: readonly PulseTrendingSnapshotItem[];
  }): Promise<void> => {
    const stored: PulseStoredTrendingSnapshot = {
      policy,
      generation,
      items: [...items],
    };
    await query(
      `INSERT INTO "PulseTrendingSnapshot" (day, period, sector_scope, region_scope, computed_at, items)
       SELECT ?::date, ?, ?, ?, to_timestamp(?::float8 / 1000), ?::jsonb
       WHERE ${CURRENT_DATA_GENERATION} = ?
       ON CONFLICT (day, period, sector_scope, region_scope)
       DO UPDATE SET computed_at = EXCLUDED.computed_at, items = EXCLUDED.items`,
      [
        day,
        period,
        sectorScope,
        regionScope,
        computedAt.getTime(),
        toJson(stored),
        generation,
      ]
    );
  },

  deleteTrendingSnapshots: async (): Promise<void> => {
    await query('DELETE FROM "PulseTrendingSnapshot"');
  },
  // endregion

  // region Digest
  // The `limit` keys of the network in the widest platforms ranges over the
  // activity window, k platforms at least, with their distinct platforms per
  // week over the trend baseline (newest week first). Selected and ordered by
  // platforms range, then by a hash of the day and the key: the order never
  // tells which of two keys of one range more platforms reported, and the
  // digests of two days list the keys of one range in unrelated orders.
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
      `WITH counted AS (
         SELECT c.at_rest_key, c.object_type,
                COUNT(DISTINCT c.pulse_platform_id)::int AS in_window
         FROM "PulseContribution" c
         WHERE c.day > ?::date - ?::int AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type
         HAVING COUNT(DISTINCT c.pulse_platform_id) >= ?
       ),
       top AS (
         SELECT counted.*,
                (SELECT COUNT(*) FROM jsonb_array_elements_text(?::jsonb) AS bucket(min)
                 WHERE counted.in_window >= bucket.min::int)::int AS platforms_range,
                md5(?::text || encode(counted.at_rest_key, 'hex') || counted.object_type) AS day_order
         FROM counted
         ORDER BY platforms_range DESC, day_order
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
       GROUP BY top.at_rest_key, top.object_type, top.in_window, top.platforms_range, top.day_order
       ORDER BY top.platforms_range DESC, top.day_order`,
      [
        day,
        PULSE_ACTIVITY_WINDOW_DAYS,
        day,
        kThreshold,
        JSON.stringify(PULSE_PLATFORMS_BUCKETS.map((bucket) => bucket.min)),
        day,
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
    // A snapshot written before the data generation was stored has none: it
    // is never served, so it is recomputed.
    const stored = row.items as Partial<PulseStoredDigestSnapshot> | null;
    const isStored =
      !!stored &&
      !!stored.policy &&
      typeof stored.size === 'number' &&
      typeof stored.generation === 'number' &&
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
       SELECT ?::date, to_timestamp(?::float8 / 1000), ?::jsonb
       WHERE ${CURRENT_DATA_GENERATION} = ?
       ON CONFLICT (day)
       DO UPDATE SET computed_at = EXCLUDED.computed_at, items = EXCLUDED.items`,
      [day, computedAt.getTime(), toJson(stored), stored.generation]
    );
  },

  deleteDigestSnapshots: async (): Promise<void> => {
    await query('DELETE FROM "PulseDigestSnapshot"');
  },
  // endregion

  // region Data generation
  // Bumped once a purge or a retention run has deleted contributions: every
  // snapshot computed from an earlier generation is then neither saved nor
  // served.
  loadDataGeneration: async (): Promise<number> => {
    const [row] = await query<{ generation: number }>(
      `SELECT ${CURRENT_DATA_GENERATION} AS generation`
    );
    return row?.generation ?? 0;
  },

  bumpDataGeneration: async (): Promise<void> => {
    await query(
      `INSERT INTO "PulseDataGeneration" (id, generation) VALUES (1, 1)
       ON CONFLICT (id) DO UPDATE SET generation = "PulseDataGeneration".generation + 1`
    );
  },
  // endregion

  // region Benchmark
  // The platforms active over the period (network) and in the caller's sector,
  // and for every (type, kind) pair reported: the caller's totals and the
  // medians of the per-platform totals over those populations, a platform
  // without the pair counting 0 (its sector total: its events in that sector
  // only). Computed in the database like loadBenchmarkTopItems, the zeros
  // being the first positions of the sorted totals, so a benchmark transfers
  // one row per pair whatever the size of the network. k is applied by
  // PulseStats.summarizeBenchmark.
  loadBenchmarkMetrics: async ({
    platformId,
    fromDay,
    toDay,
    sectorBucket,
  }: {
    platformId: number;
    fromDay: string;
    toDay: string;
    sectorBucket: PulseSectorBucket;
  }): Promise<PulseBenchmarkMetrics> => {
    const rows = await query<{
      network_platforms: number;
      sector_platforms: number;
      t: PulseObjectType | null;
      e: PulseEventKind | null;
      caller_total: number | null;
      caller_sector_total: number | null;
      network_median: number | null;
      sector_median: number | null;
    }>(
      `WITH platform_totals AS (
         SELECT pulse_platform_id AS platform, object_type, event_kind,
                SUM(event_count)::float8 AS total,
                COALESCE(SUM(event_count) FILTER (WHERE sector_bucket = ?), 0)::float8 AS sector_total
         FROM "PulsePlatformDailyTotal"
         WHERE day >= ?::date AND day <= ?::date
         GROUP BY pulse_platform_id, object_type, event_kind
       ),
       population AS (
         SELECT COUNT(DISTINCT pulse_platform_id)::int AS network,
                (COUNT(DISTINCT pulse_platform_id) FILTER (WHERE sector_bucket = ?))::int AS sector
         FROM "PulsePlatformDailyTotal"
         WHERE day >= ?::date AND day <= ?::date
       ),
       metrics AS (
         SELECT object_type, event_kind,
                COALESCE(array_agg(total ORDER BY total) FILTER (WHERE total > 0), '{}') AS network_totals,
                COALESCE(array_agg(sector_total ORDER BY sector_total) FILTER (WHERE sector_total > 0), '{}') AS sector_totals,
                COALESCE(SUM(total) FILTER (WHERE platform = ?), 0)::float8 AS caller_total,
                COALESCE(SUM(sector_total) FILTER (WHERE platform = ?), 0)::float8 AS caller_sector_total
         FROM platform_totals
         GROUP BY object_type, event_kind
       ),
       scoped AS (
         SELECT m.object_type, m.event_kind, 'network' AS scope, m.network_totals AS totals,
                GREATEST(p.network, cardinality(m.network_totals)) AS size
         FROM metrics m CROSS JOIN population p
         UNION ALL
         SELECT m.object_type, m.event_kind, 'sector', m.sector_totals,
                GREATEST(p.sector, cardinality(m.sector_totals))
         FROM metrics m CROSS JOIN population p
       ),
       positions AS (
         SELECT object_type, event_kind, scope, totals, size,
                size - cardinality(totals) AS zeros,
                floor((size - 1) * 0.5)::int AS low,
                ceil((size - 1) * 0.5)::int AS high,
                (((size - 1) * 0.5) - floor((size - 1) * 0.5))::float8 AS fraction
         FROM scoped
       ),
       bounds AS (
         SELECT object_type, event_kind, scope, size, fraction,
                CASE WHEN low < zeros THEN 0 ELSE totals[low - zeros + 1] END AS low_value,
                CASE WHEN high < zeros THEN 0 ELSE totals[high - zeros + 1] END AS high_value
         FROM positions
       ),
       medians AS (
         SELECT object_type, event_kind,
                MAX(low_value + (high_value - low_value) * fraction)
                  FILTER (WHERE scope = 'network' AND size > 0) AS network_median,
                MAX(low_value + (high_value - low_value) * fraction)
                  FILTER (WHERE scope = 'sector' AND size > 0) AS sector_median
         FROM bounds
         GROUP BY object_type, event_kind
       )
       SELECT p.network AS network_platforms, p.sector AS sector_platforms,
              m.object_type AS t, m.event_kind AS e, m.caller_total, m.caller_sector_total,
              d.network_median::float8 AS network_median, d.sector_median::float8 AS sector_median
       FROM population p
       LEFT JOIN metrics m ON true
       LEFT JOIN medians d ON d.object_type = m.object_type AND d.event_kind = m.event_kind`,
      [
        sectorBucket,
        fromDay,
        toDay,
        sectorBucket,
        fromDay,
        toDay,
        platformId,
        platformId,
      ]
    );
    const [first] = rows;
    return {
      networkPlatforms: first?.network_platforms ?? 0,
      sectorPlatforms: first?.sector_platforms ?? 0,
      metrics: rows.flatMap((row) =>
        row.t && row.e
          ? [
              {
                objectType: row.t,
                eventKind: row.e,
                callerTotal: row.caller_total ?? 0,
                callerSectorTotal: row.caller_sector_total ?? 0,
                networkMedian: row.network_median,
                sectorMedian: row.sector_median,
              },
            ]
          : []
      ),
    };
  },

  // Keys of the caller published in its sector over the period where the
  // caller is above the median of the per-platform sums of the sector
  // platforms, strongest relative outliers first. Like the metric medians, the
  // median runs over every platform active in the sector, a platform that did
  // not report the key counting 0; k distinct reporters are still required.
  // The zeros are not materialized: they are the first positions of the
  // sorted totals, so percentile_cont(0.5) is read from the reported ones.
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
         -- The caller's counts in the sector only, like the per-platform
         -- totals its median is computed from.
         SELECT c.at_rest_key, c.object_type, SUM(c.event_count)::float8 AS my_count
         FROM "PulseContribution" c
         JOIN "PulseKey" pk ON pk.at_rest_key = c.at_rest_key AND pk.object_type = c.object_type
         WHERE pk.platform_count >= ? AND c.pulse_platform_id = ?
           AND c.sector_bucket = ?
           AND c.day >= ?::date AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type
       ),
       sector_size AS (
         SELECT COUNT(DISTINCT pulse_platform_id)::int AS platforms
         FROM "PulsePlatformDailyTotal"
         WHERE sector_bucket = ? AND day >= ?::date AND day <= ?::date
       ),
       per_platform AS (
         SELECT c.at_rest_key, c.object_type, c.pulse_platform_id, SUM(c.event_count)::float8 AS total
         FROM "PulseContribution" c
         JOIN mine m ON m.at_rest_key = c.at_rest_key AND m.object_type = c.object_type
         WHERE c.sector_bucket = ? AND c.day >= ?::date AND c.day <= ?::date
         GROUP BY c.at_rest_key, c.object_type, c.pulse_platform_id
       ),
       reported AS (
         SELECT at_rest_key, object_type, array_agg(total ORDER BY total) AS totals
         FROM per_platform
         GROUP BY at_rest_key, object_type
         HAVING COUNT(*) >= ?
       ),
       positions AS (
         SELECT r.at_rest_key, r.object_type, r.totals,
                GREATEST(z.platforms, cardinality(r.totals)) - cardinality(r.totals) AS zeros,
                floor((GREATEST(z.platforms, cardinality(r.totals)) - 1) * 0.5)::int AS low,
                ceil((GREATEST(z.platforms, cardinality(r.totals)) - 1) * 0.5)::int AS high,
                (((GREATEST(z.platforms, cardinality(r.totals)) - 1) * 0.5)
                  - floor((GREATEST(z.platforms, cardinality(r.totals)) - 1) * 0.5))::float8 AS fraction
         FROM reported r CROSS JOIN sector_size z
       ),
       bounds AS (
         SELECT at_rest_key, object_type, fraction,
                CASE WHEN low < zeros THEN 0 ELSE totals[low - zeros + 1] END AS low_value,
                CASE WHEN high < zeros THEN 0 ELSE totals[high - zeros + 1] END AS high_value
         FROM positions
       ),
       stats AS (
         SELECT at_rest_key, object_type,
                (low_value + (high_value - low_value) * fraction)::float8 AS median
         FROM bounds
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
        sectorBucket,
        fromDay,
        toDay,
        sectorBucket,
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
    // The totals of the day feed the benchmark medians and the active
    // contributors: they leave with the ledger rows, in the same step.
    await query(
      'DELETE FROM "PulsePlatformDailyTotal" WHERE pulse_platform_id = ? AND day = ?::date',
      [platformId, day]
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
