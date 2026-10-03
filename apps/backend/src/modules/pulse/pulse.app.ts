import {
  PlatformConfigurationStatus,
  PlatformIdentifier,
  PulseBenchmarkInput,
  PulseBenchmarkResult,
  PulseDigest,
  PulseDigestInput,
  PulseLookupInput,
  PulseLookupResult,
  PulsePurgeResult,
  PulseSalt,
  PulseStatus,
  PulseTrendingInput,
  PulseTrendingResult,
  PushPulseInput,
  PushPulseResult,
} from '../../__generated__/resolvers-types';
import { withAdvisoryLock } from '../../context/database.context';
import { logApp } from '../../utils/app-logger.util';
import { getErrorStringProperty } from '../../utils/error/error-guard.util';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import { PulseConfig, PulseSecrets, PulseSettings } from './pulse.config';
import {
  PULSE_ACTIVITY_WINDOW_DAYS,
  PULSE_DIGEST_TRENDING_NAMED_RANKS,
  PULSE_DIGEST_TRENDING_PERIOD,
  PULSE_DIGEST_TRENDING_RANKS,
  PULSE_LOCK_DIGEST,
  PULSE_LOCK_PLATFORM,
  PULSE_LOCK_RATE_LIMIT,
  PULSE_LOCK_TRENDING,
  PULSE_MAINTENANCE_BATCH_SIZE,
  PULSE_MAX_BENCHMARK_ITEMS,
  PULSE_PERIOD_DAYS,
  PULSE_PUBLICATION_POLICY_VERSION,
  PULSE_PUSH_DEADLOCK_ATTEMPTS,
  PULSE_RATE_LIMIT_BUCKET_SECONDS,
  PULSE_RATE_LIMIT_MAX_WINDOW_SECONDS,
  PULSE_RATE_LIMIT_WINDOW_SECONDS,
  PULSE_SALT_RETENTION_DAYS,
  PULSE_SCOPE_ALL,
  PULSE_TRENDING_ITEMS_PER_OBJECT_TYPE,
  PulseOperation,
} from './pulse.const';
import { PulseCrypto } from './pulse.crypto.helper';
import { PulseClock, PulseDay } from './pulse.day.helper';
import { PulseDomain } from './pulse.domain';
import { isPulseError, PulseErrors } from './pulse.errors';
import { PulseHelper } from './pulse.helper';
import {
  pulsePurgedRecordsCounter,
  pulseRecordsAcceptedCounter,
  pulseRequestsRejectedCounter,
  pulseRetentionDeletedRowsCounter,
} from './pulse.metrics';
import { PulseStats } from './pulse.stats.helper';
import {
  PulseDigestSnapshotItem,
  pulseKeyId,
  PulseKeyPresence,
  PulseKeyRef,
  PulseLedgerRecord,
  PulsePlatformRecord,
  PulsePublicationPolicy,
  PulseStoredDigestSnapshot,
  PulseTrendingSnapshotItem,
} from './pulse.types';
import {
  PulseValidation,
  ValidatedTrendingInput,
} from './pulse.validation.helper';

export interface PulseRequest {
  platformId: string | null;
  token: string | null;
}

interface PulseCaller {
  pseudonym: string;
  settings: PulseSettings;
  secrets: PulseSecrets;
  now: Date;
  today: string;
}

const RETRYABLE_TRANSACTION_ERROR_CODES = new Set(['40P01', '40001']);
const SALT_CACHE_MAX_ENTRIES = 4;

// A day's salt never changes once created, so it can be cached per process.
const saltCache = new Map<string, Buffer>();

const cacheSalt = (day: string, salt: Buffer): Buffer => {
  saltCache.set(day, salt);
  while (saltCache.size > SALT_CACHE_MAX_ENTRIES) {
    const oldest = [...saltCache.keys()].sort()[0];
    if (oldest === undefined) {
      break;
    }
    saltCache.delete(oldest);
  }
  return salt;
};

const loadSalt = async (day: string): Promise<Buffer | undefined> => {
  const cached = saltCache.get(day);
  if (cached) {
    return cached;
  }
  const salt = await PulseDomain.loadSalt(day);
  return salt ? cacheSalt(day, salt) : undefined;
};

const loadOrCreateSalt = async (day: string): Promise<Buffer> => {
  const existing = await loadSalt(day);
  if (existing) {
    return existing;
  }
  await PulseDomain.insertSaltIfMissing(day, PulseCrypto.generateSalt());
  const salt = await PulseDomain.loadSalt(day);
  if (!salt) {
    throw new Error(`Threat Pulse salt of ${day} could not be created`);
  }
  return cacheSalt(day, salt);
};

const requireSalt = async (day: string): Promise<Buffer> => {
  const salt = await loadSalt(day);
  if (!salt) {
    throw PulseErrors.badUserInput(
      `no Threat Pulse salt was issued for ${day}, call pulseSalt first`
    );
  }
  return salt;
};

const withTransactionRetry = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await callback();
    } catch (error) {
      const code = getErrorStringProperty(error, 'code');
      if (
        attempt >= PULSE_PUSH_DEADLOCK_ATTEMPTS ||
        !code ||
        !RETRYABLE_TRANSACTION_ERROR_CODES.has(code)
      ) {
        throw error;
      }
      logApp.warn('[Pulse] Retrying after a transaction conflict', {
        attempt,
        code,
      });
    }
  }
};

const withPlatformLock = <T>(
  pseudonym: string,
  callback: () => Promise<T>
): Promise<T> =>
  withTransactionRetry(() =>
    withAdvisoryLock(PULSE_LOCK_PLATFORM, pseudonym, callback)
  );

const enforceRateLimit = async ({
  pseudonym,
  operation,
  limit,
  now,
}: {
  pseudonym: string;
  operation: PulseOperation;
  limit: number;
  now: Date;
}): Promise<void> => {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const windowSeconds = PULSE_RATE_LIMIT_WINDOW_SECONDS[operation];
  const decision = await withAdvisoryLock(
    PULSE_LOCK_RATE_LIMIT,
    `${pseudonym}:${operation}`,
    async () => {
      const buckets = await PulseDomain.loadRateLimitBuckets({
        pseudonym,
        operation,
        sinceSeconds:
          nowSeconds - windowSeconds - PULSE_RATE_LIMIT_BUCKET_SECONDS,
      });
      const result = PulseStats.decideRateLimit({
        buckets,
        nowSeconds,
        windowSeconds,
        bucketSeconds: PULSE_RATE_LIMIT_BUCKET_SECONDS,
        limit,
      });
      if (result.allowed) {
        await PulseDomain.incrementRateLimitBucket({
          pseudonym,
          operation,
          bucketStartSeconds:
            nowSeconds - (nowSeconds % PULSE_RATE_LIMIT_BUCKET_SECONDS),
        });
      }
      return result;
    }
  );
  if (!decision.allowed) {
    throw PulseErrors.rateLimited(decision.retryAfterSeconds);
  }
};

const canonicalUuid = (value: string): string =>
  value.trim().toLowerCase().replace(/[{}-]/g, '');

// Every operation needs an active OpenCTI registration on top of the
// @platform_token directive, which also accepts pending deployment tokens.
const authorize = async (
  request: PulseRequest,
  operation: PulseOperation,
  { requiredPlatformId }: { requiredPlatformId?: string } = {}
): Promise<PulseCaller> => {
  const config = PulseConfig.get();
  if (!config.enabled) {
    throw PulseErrors.disabled();
  }
  const { platformId, token } = request;
  if (!platformId || !token) {
    throw PulseErrors.unauthenticated();
  }
  const registration =
    await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
      { platform_id: platformId, token }
    );
  if (
    !registration ||
    registration.platformConfiguration.status !==
      PlatformConfigurationStatus.Active
  ) {
    throw PulseErrors.unauthenticated();
  }
  if (registration.platformIdentifier !== PlatformIdentifier.Opencti) {
    throw PulseErrors.forbidden('Threat Pulse only accepts OpenCTI platforms');
  }
  // PostgreSQL authenticates every spelling of a UUID (case, braces, hyphens):
  // the pseudonym, the rate limit and the purge scope use the registration's
  // canonical id, so one registration is always one contributor.
  const canonicalPlatformId = registration.platformConfiguration.platform_id;
  if (
    requiredPlatformId !== undefined &&
    canonicalUuid(requiredPlatformId) !== canonicalUuid(canonicalPlatformId)
  ) {
    throw PulseErrors.forbidden(
      'platformId must match the XTM-Hub-Platform-Id header'
    );
  }

  const pseudonym = PulseCrypto.platformPseudonym(
    canonicalPlatformId,
    config.secrets.platformKey
  );
  const now = PulseClock.now();
  await enforceRateLimit({
    pseudonym,
    operation,
    limit: config.settings.rateLimits[operation],
    now,
  });
  return {
    pseudonym,
    settings: config.settings,
    secrets: config.secrets,
    now,
    today: PulseDay.today(now),
  };
};

const contributionStateOf = (
  caller: PulseCaller,
  platform: PulsePlatformRecord | undefined
) =>
  PulseStats.contributionState({
    lastContributionDay: platform?.last_contribution_day ?? null,
    today: caller.today,
    windowDays: caller.settings.contributionWindowDays,
    graceDays: caller.settings.contributionGraceDays,
  });

// Reciprocity is enforced here, never only in OpenCTI: lookups, trending and
// benchmarks need a contribution within the grace period; the salt and the
// digest stay open to every registered platform.
const requireReadAccess = async (
  caller: PulseCaller
): Promise<PulsePlatformRecord> => {
  const platform = await PulseDomain.loadPlatformByPseudonym(caller.pseudonym);
  if (!platform || !contributionStateOf(caller, platform).readAccess) {
    throw PulseErrors.contributionRequired(
      caller.settings.contributionGraceDays
    );
  }
  return platform;
};

const activityWindowStart = (day: string): string =>
  PulseDay.addDays(day, -(PULSE_ACTIVITY_WINDOW_DAYS - 1));

const runOperation = async <T>(
  operation: PulseOperation,
  callback: () => Promise<T>
): Promise<T> => {
  try {
    return await callback();
  } catch (error) {
    if (isPulseError(error)) {
      pulseRequestsRejectedCounter.inc({
        operation,
        code: String(error.extensions.code),
      });
    }
    throw error;
  }
};

const recordContributions = async ({
  pseudonym,
  input,
  records,
}: {
  pseudonym: string;
  input: PushPulseInput;
  records: readonly PulseLedgerRecord[];
}): Promise<void> => {
  const {
    day,
    sector_bucket: sectorBucket,
    region_bucket: regionBucket,
  } = input;
  const platformId = await PulseDomain.upsertPlatformContribution({
    pseudonym,
    sectorBucket,
    regionBucket,
    day,
  });
  const existingTupleKeys = await PulseDomain.loadExistingTupleKeys({
    platformId,
    day,
    sectorBucket,
    regionBucket,
    keys: PulseHelper.uniqueKeyRefs(records),
  });
  const aggregation = PulseHelper.aggregateBatch(records, existingTupleKeys);
  await PulseDomain.upsertContributions({
    platformId,
    day,
    sectorBucket,
    regionBucket,
    records,
  });
  await PulseDomain.upsertDailyAggregates({
    day,
    sectorBucket,
    regionBucket,
    increments: aggregation.aggregates,
  });
  const firstContributions = await PulseDomain.upsertKeyContributors({
    platformId,
    day,
    keys: aggregation.keys,
  });
  await PulseDomain.incrementKeyPlatformCounts(
    PulseHelper.sortKeyRefs(firstContributions)
  );
  await PulseDomain.upsertPlatformDailyTotals({
    platformId,
    day,
    sectorBucket,
    regionBucket,
    totals: aggregation.totals,
  });
};

const computeTrendingItems = async ({
  settings,
  input,
}: {
  settings: PulseSettings;
  input: ValidatedTrendingInput;
}): Promise<PulseTrendingSnapshotItem[]> => {
  const { day } = input;
  const retentionStart = PulseDay.retentionStart(day, settings.retentionMonths);
  const counts = await PulseDomain.loadTrendingCounts({
    day,
    periodDays: PULSE_PERIOD_DAYS[input.period],
    sectorBucket: input.sectorBucket,
    regionBucket: input.regionBucket,
    kThreshold: settings.kThreshold,
    retentionStart,
    limitPerObjectType: PULSE_TRENDING_ITEMS_PER_OBJECT_TYPE,
  });
  const ranked = PulseHelper.rankTrending(counts, settings.kThreshold);
  if (ranked.length === 0) {
    return [];
  }
  const keys: PulseKeyRef[] = ranked.map(({ k, t }) => ({ k, t }));
  const platformsInWindow = await PulseDomain.countKeyPlatformsInWindow({
    keys,
    fromDay: activityWindowStart(day),
    toDay: day,
  });
  const seen = await PulseDomain.loadSeenRanges({
    keys,
    sinceDay: retentionStart,
    day,
    kThreshold: settings.kThreshold,
  });
  const activeContributors = await PulseDomain.countActiveContributors({
    fromDay: activityWindowStart(day),
    toDay: day,
  });
  return ranked.flatMap((item) => {
    const keyId = pulseKeyId(item);
    const range = seen.get(keyId);
    if (!range) {
      return [];
    }
    return [
      {
        k: item.k,
        t: item.t,
        recent: item.recent,
        baseline: item.baseline,
        growth: item.growth,
        prevalence: PulseStats.prevalenceBucket({
          platformsInWindow: platformsInWindow.get(keyId) ?? 0,
          activeContributors,
          kThreshold: settings.kThreshold,
        }),
        firstSeen: range.firstSeen,
      },
    ];
  });
};

// Trending answers are shared by every caller asking the same scope, so they
// are computed once per TTL under a lock and cached in PostgreSQL.
const loadTrendingItems = async ({
  settings,
  input,
  now,
}: {
  settings: PulseSettings;
  input: ValidatedTrendingInput;
  now: Date;
}): Promise<PulseTrendingSnapshotItem[]> => {
  const scope = {
    day: input.day,
    period: input.period,
    sectorScope: input.sectorBucket ?? PULSE_SCOPE_ALL,
    regionScope: input.regionBucket ?? PULSE_SCOPE_ALL,
  };
  const ttlMs = settings.trendingCacheTtlMinutes * 60 * 1000;
  const policy: PulsePublicationPolicy = {
    version: PULSE_PUBLICATION_POLICY_VERSION,
    kThreshold: settings.kThreshold,
    retentionMonths: settings.retentionMonths,
  };
  // A snapshot published under other rules (an older version, another k or
  // retention) or computed before the last purge or retention run is never
  // served, however fresh.
  const isFresh = (
    snapshot:
      | {
          computedAt: Date;
          policy: PulsePublicationPolicy | null;
          generation: number | null;
        }
      | undefined,
    generation: number
  ) =>
    !!snapshot &&
    snapshot.policy?.version === policy.version &&
    snapshot.policy.kThreshold === policy.kThreshold &&
    snapshot.policy.retentionMonths === policy.retentionMonths &&
    snapshot.generation === generation &&
    now.getTime() - snapshot.computedAt.getTime() < ttlMs &&
    snapshot.computedAt.getTime() <= now.getTime();

  const cached = await PulseDomain.loadTrendingSnapshot(scope);
  if (cached && isFresh(cached, await PulseDomain.loadDataGeneration())) {
    return cached.items;
  }
  return withAdvisoryLock(
    PULSE_LOCK_TRENDING,
    `${scope.day}:${scope.period}:${scope.sectorScope}:${scope.regionScope}`,
    async () => {
      // Read before the data: the items are only saved under this generation.
      const generation = await PulseDomain.loadDataGeneration();
      const current = await PulseDomain.loadTrendingSnapshot(scope);
      if (current && isFresh(current, generation)) {
        return current.items;
      }
      const items = await computeTrendingItems({ settings, input });
      await PulseDomain.saveTrendingSnapshot({
        ...scope,
        computedAt: now,
        policy,
        generation,
        items,
      });
      return items;
    }
  );
};

const computeDigestItems = async ({
  settings,
  day,
}: {
  settings: PulseSettings;
  day: string;
}): Promise<PulseDigestSnapshotItem[]> => {
  const candidates = await PulseDomain.loadDigestCandidates({
    day,
    kThreshold: settings.kThreshold,
    limit: settings.digestSize,
  });
  if (candidates.length === 0) {
    return [];
  }
  const activeContributors = await PulseDomain.countActiveContributors({
    fromDay: activityWindowStart(day),
    toDay: day,
  });
  return candidates.map((candidate) => ({
    k: candidate.k,
    t: candidate.t,
    prevalence: PulseStats.prevalenceBucket({
      platformsInWindow: candidate.platformsInWindow,
      activeContributors,
      kThreshold: settings.kThreshold,
    }),
    trend: PulseStats.weeklyTrend(candidate.weekly, settings.kThreshold),
  }));
};

// One digest per day for the whole network, computed once per TTL under a
// lock like the trending snapshots.
const loadDigestItems = async ({
  settings,
  day,
  now,
}: {
  settings: PulseSettings;
  day: string;
  now: Date;
}): Promise<PulseDigestSnapshotItem[]> => {
  const ttlMs = settings.trendingCacheTtlMinutes * 60 * 1000;
  const policy: PulsePublicationPolicy = {
    version: PULSE_PUBLICATION_POLICY_VERSION,
    kThreshold: settings.kThreshold,
    retentionMonths: settings.retentionMonths,
  };
  const isFresh = (
    snapshot:
      | { computedAt: Date; stored: PulseStoredDigestSnapshot | null }
      | undefined,
    generation: number
  ): snapshot is { computedAt: Date; stored: PulseStoredDigestSnapshot } =>
    !!snapshot?.stored &&
    snapshot.stored.policy.version === policy.version &&
    snapshot.stored.policy.kThreshold === policy.kThreshold &&
    snapshot.stored.policy.retentionMonths === policy.retentionMonths &&
    snapshot.stored.size === settings.digestSize &&
    snapshot.stored.generation === generation &&
    now.getTime() - snapshot.computedAt.getTime() < ttlMs &&
    snapshot.computedAt.getTime() <= now.getTime();

  const cached = await PulseDomain.loadDigestSnapshot(day);
  if (isFresh(cached, await PulseDomain.loadDataGeneration())) {
    return cached.stored.items;
  }
  return withAdvisoryLock(PULSE_LOCK_DIGEST, day, async () => {
    // Read before the data: the items are only saved under this generation.
    const generation = await PulseDomain.loadDataGeneration();
    const current = await PulseDomain.loadDigestSnapshot(day);
    if (isFresh(current, generation)) {
      return current.stored.items;
    }
    const items = await computeDigestItems({ settings, day });
    await PulseDomain.saveDigestSnapshot({
      day,
      computedAt: now,
      stored: { policy, size: settings.digestSize, generation, items },
    });
    return items;
  });
};

// After contributions were deleted: the generation moves first, so a snapshot
// computed from the deleted data and saved meanwhile is never served.
const invalidateSnapshots = async (): Promise<void> => {
  await PulseDomain.bumpDataGeneration();
  await PulseDomain.deleteTrendingSnapshots();
  await PulseDomain.deleteDigestSnapshots();
};

const purgeNextContributionDay = async (
  platformId: number
): Promise<number | null> => {
  const day = await PulseDomain.loadOldestContributionDay(platformId);
  return day ? PulseDomain.purgeContributionDay({ platformId, day }) : null;
};

const purgeAllKeyContributors = async (platformId: number): Promise<void> => {
  let removed: number;
  do {
    removed = await PulseDomain.purgeKeyContributorsBatch({
      platformId,
      batchSize: PULSE_MAINTENANCE_BATCH_SIZE,
    });
  } while (removed > 0);
};

// Day by day under the platform lock, each step keeping the aggregates equal
// to the ledger; the last step deletes the platform record itself.
const purgePlatform = async (pseudonym: string): Promise<number> => {
  const platform = await PulseDomain.loadPlatformByPseudonym(pseudonym);
  if (!platform) {
    return 0;
  }
  let deleted = 0;
  let removed = await withPlatformLock(pseudonym, () =>
    purgeNextContributionDay(platform.id)
  );
  while (removed !== null) {
    deleted += removed;
    removed = await withPlatformLock(pseudonym, () =>
      purgeNextContributionDay(platform.id)
    );
  }
  deleted += await withPlatformLock(pseudonym, async () => {
    let lateRows = 0;
    let lateDay = await purgeNextContributionDay(platform.id);
    while (lateDay !== null) {
      lateRows += lateDay;
      lateDay = await purgeNextContributionDay(platform.id);
    }
    await purgeAllKeyContributors(platform.id);
    await PulseDomain.deletePlatform(platform.id);
    return lateRows;
  });
  await invalidateSnapshots();
  return deleted;
};

const deleteInBatches = async (
  deleteBatch: () => Promise<number>
): Promise<number> => {
  let total = 0;
  let removed: number;
  do {
    removed = await deleteBatch();
    total += removed;
  } while (removed > 0);
  return total;
};

export const PulseApp = {
  pulseSalt: (request: PulseRequest, day: string): Promise<PulseSalt> =>
    runOperation(PulseOperation.PulseSalt, async () => {
      const caller = await authorize(request, PulseOperation.PulseSalt);
      PulseValidation.requestDay(day, caller.now);
      const salt = await loadOrCreateSalt(day);
      return { day, salt: salt.toString('hex') };
    }),

  pulseStatus: (request: PulseRequest): Promise<PulseStatus> =>
    runOperation(PulseOperation.PulseStatus, async () => {
      const caller = await authorize(request, PulseOperation.PulseStatus);
      const platform = await PulseDomain.loadPlatformByPseudonym(
        caller.pseudonym
      );
      const activeContributors = await PulseDomain.countActiveContributors({
        fromDay: activityWindowStart(caller.today),
        toDay: caller.today,
      });
      const contribution = contributionStateOf(caller, platform);
      return {
        day: caller.today,
        k_threshold: caller.settings.kThreshold,
        retention_months: caller.settings.retentionMonths,
        contributors_bucket: PulseStats.contributorsBucket(
          activeContributors,
          caller.settings.kThreshold
        ),
        read_access: contribution.readAccess,
        last_contribution_day: platform?.last_contribution_day ?? null,
        contribution_status: contribution.status,
        read_access_until: contribution.readAccessUntil,
        contribution_window_days: caller.settings.contributionWindowDays,
        contribution_grace_days: caller.settings.contributionGraceDays,
      };
    }),

  // The preview: open to every registered platform, contributing or not, and
  // it reads nothing from the caller but its sector and region buckets.
  pulseDigest: (
    request: PulseRequest,
    input: PulseDigestInput
  ): Promise<PulseDigest> =>
    runOperation(PulseOperation.PulseDigest, async () => {
      const caller = await authorize(request, PulseOperation.PulseDigest);
      const validated = PulseValidation.digestInput(input, caller.now);
      const salt = await loadOrCreateSalt(validated.day);
      const toHash = (k: string) =>
        PulseCrypto.atRestKeyToTransportHash(k, salt, caller.secrets.atRestKey);
      const items = await loadDigestItems({
        settings: caller.settings,
        day: validated.day,
        now: caller.now,
      });
      const trending = (
        await loadTrendingItems({
          settings: caller.settings,
          input: {
            day: validated.day,
            period: PULSE_DIGEST_TRENDING_PERIOD,
            sectorBucket: validated.sectorBucket,
            regionBucket: validated.regionBucket,
            objectTypes: null,
            first: PULSE_DIGEST_TRENDING_RANKS,
          },
          now: caller.now,
        })
      ).slice(0, PULSE_DIGEST_TRENDING_RANKS);
      const named = trending.slice(0, PULSE_DIGEST_TRENDING_NAMED_RANKS);
      return {
        day: validated.day,
        sector_bucket: validated.sectorBucket,
        region_bucket: validated.regionBucket,
        items: items.map((item) => ({
          hash: toHash(item.k),
          object_type: item.t,
          prevalence_bucket: item.prevalence,
          trend: item.trend,
        })),
        trending: {
          period: PULSE_DIGEST_TRENDING_PERIOD,
          items: named.map((item, index) => ({
            rank: index + 1,
            hash: toHash(item.k),
            object_type: item.t,
            prevalence_bucket: item.prevalence,
            trend: PulseStats.trendDirection(item.recent, item.baseline),
          })),
          locked_count: trending.length - named.length,
        },
      };
    }),

  pushPulse: (
    request: PulseRequest,
    input: PushPulseInput
  ): Promise<PushPulseResult> =>
    runOperation(PulseOperation.PushPulse, async () => {
      const caller = await authorize(request, PulseOperation.PushPulse);
      const validated = PulseValidation.pushInput(input, caller.now);
      const salt = await requireSalt(validated.day);
      const records: PulseLedgerRecord[] = PulseHelper.sortLedgerRecords(
        validated.records.map((record) => ({
          k: PulseCrypto.transportHashToAtRestKey(
            record.hash,
            salt,
            caller.secrets.atRestKey
          ),
          t: record.object_type,
          e: record.event_kind,
          c: record.count,
        }))
      );
      await withPlatformLock(caller.pseudonym, () =>
        recordContributions({
          pseudonym: caller.pseudonym,
          input: validated,
          records,
        })
      );
      for (const record of records) {
        pulseRecordsAcceptedCounter.inc({ object_type: record.t });
      }
      return { accepted: records.length, day: validated.day };
    }),

  pulseLookup: (
    request: PulseRequest,
    input: PulseLookupInput
  ): Promise<PulseLookupResult[]> =>
    runOperation(PulseOperation.PulseLookup, async () => {
      const caller = await authorize(request, PulseOperation.PulseLookup);
      const validated = PulseValidation.lookupInput(input, caller.now);
      const platform = await requireReadAccess(caller);
      const salt = await requireSalt(validated.day);
      const { kThreshold, retentionMonths } = caller.settings;

      const keyByHash = new Map<string, PulseKeyRef>();
      for (const hash of validated.hashes) {
        keyByHash.set(hash, {
          k: PulseCrypto.transportHashToAtRestKey(
            hash,
            salt,
            caller.secrets.atRestKey
          ),
          t: validated.object_type,
        });
      }
      const keys = [...keyByHash.values()];
      const retentionStart = PulseDay.retentionStart(
        validated.day,
        retentionMonths
      );
      // Bounded by the requested day too: a lookup of yesterday never counts
      // the platforms that first contributed the key today.
      const networkPlatforms = await PulseDomain.countKeyPlatformsInWindow({
        keys,
        fromDay: retentionStart,
        toDay: validated.day,
      });
      const publishedKeys = keys.filter(
        (key) => (networkPlatforms.get(pulseKeyId(key)) ?? 0) >= kThreshold
      );

      const presenceByKey = new Map<string, PulseKeyPresence[]>();
      let seen = new Map<string, { firstSeen: string; lastSeen: string }>();
      let activeContributors = 0;
      if (publishedKeys.length > 0) {
        seen = await PulseDomain.loadSeenRanges({
          keys: publishedKeys,
          sinceDay: retentionStart,
          day: validated.day,
          kThreshold,
        });
        const presences = await PulseDomain.loadKeyPresence({
          keys: publishedKeys,
          day: validated.day,
          sectorBucket: platform.sector_bucket,
        });
        for (const presence of presences) {
          const keyId = pulseKeyId(presence);
          const keyPresences = presenceByKey.get(keyId);
          if (keyPresences) {
            keyPresences.push(presence);
          } else {
            presenceByKey.set(keyId, [presence]);
          }
        }
        activeContributors = await PulseDomain.countActiveContributors({
          fromDay: activityWindowStart(validated.day),
          toDay: validated.day,
        });
      }

      return validated.hashes.map((hash) => {
        const key = keyByHash.get(hash);
        if (!key) {
          return PulseHelper.unpublishedResult(hash);
        }
        const keyId = pulseKeyId(key);
        return PulseHelper.buildLookupResult({
          hash,
          networkPlatforms: networkPlatforms.get(keyId) ?? 0,
          seen: seen.get(keyId),
          presence: PulseStats.summarizePresence(
            presenceByKey.get(keyId) ?? []
          ),
          activeContributors,
          kThreshold,
        });
      });
    }),

  pulseTrending: (
    request: PulseRequest,
    input: PulseTrendingInput
  ): Promise<PulseTrendingResult> =>
    runOperation(PulseOperation.PulseTrending, async () => {
      const caller = await authorize(request, PulseOperation.PulseTrending);
      const validated = PulseValidation.trendingInput(input, caller.now);
      await requireReadAccess(caller);
      const salt = await requireSalt(validated.day);
      const items = await loadTrendingItems({
        settings: caller.settings,
        input: validated,
        now: caller.now,
      });
      const { objectTypes } = validated;
      return {
        day: validated.day,
        period: validated.period,
        sector_bucket: validated.sectorBucket,
        region_bucket: validated.regionBucket,
        items: items
          .filter((item) => !objectTypes || objectTypes.has(item.t))
          .slice(0, validated.first)
          .map((item) => ({
            hash: PulseCrypto.atRestKeyToTransportHash(
              item.k,
              salt,
              caller.secrets.atRestKey
            ),
            object_type: item.t,
            platforms_bucket: PulseStats.platformsBucket(item.recent),
            prevalence_bucket: item.prevalence,
            trend: PulseStats.trendDirection(item.recent, item.baseline),
            growth: PulseStats.round(item.growth),
            first_seen_network: item.firstSeen,
          })),
      };
    }),

  pulseBenchmark: (
    request: PulseRequest,
    input: PulseBenchmarkInput
  ): Promise<PulseBenchmarkResult> =>
    runOperation(PulseOperation.PulseBenchmark, async () => {
      const caller = await authorize(request, PulseOperation.PulseBenchmark, {
        requiredPlatformId: input.platformId,
      });
      const validated = PulseValidation.benchmarkInput(input, caller.now);
      const platform = await requireReadAccess(caller);
      const salt = await requireSalt(validated.day);
      const { kThreshold } = caller.settings;
      const fromDay = PulseDay.addDays(
        validated.day,
        -(PULSE_PERIOD_DAYS[validated.period] - 1)
      );

      const totals = await PulseDomain.loadPlatformTotals({
        fromDay,
        toDay: validated.day,
        sectorBucket: platform.sector_bucket,
      });
      const summary = PulseStats.summarizeBenchmark({
        totals,
        callerPlatform: platform.id,
        kThreshold,
      });
      const topItems = await PulseDomain.loadBenchmarkTopItems({
        platformId: platform.id,
        fromDay,
        toDay: validated.day,
        sectorBucket: platform.sector_bucket,
        kThreshold,
        limit: PULSE_MAX_BENCHMARK_ITEMS,
      });

      return {
        period: validated.period,
        sector_bucket: platform.sector_bucket,
        region_bucket: platform.region_bucket,
        sector_platforms_bucket:
          summary.sectorPlatforms >= kThreshold
            ? PulseStats.platformsBucket(summary.sectorPlatforms)
            : null,
        metrics: summary.metrics,
        top_items: topItems.map((item) => ({
          hash: PulseCrypto.atRestKeyToTransportHash(
            item.k,
            salt,
            caller.secrets.atRestKey
          ),
          object_type: item.t,
          platform_count: PulseStats.clampToGraphQLInt(item.myCount),
          sector_median: PulseStats.round(item.median),
          ratio: PulseStats.round(item.myCount / item.median),
        })),
      };
    }),

  pulsePurge: (
    request: PulseRequest,
    platformId: string
  ): Promise<PulsePurgeResult> =>
    runOperation(PulseOperation.PulsePurge, async () => {
      const caller = await authorize(request, PulseOperation.PulsePurge, {
        requiredPlatformId: platformId,
      });
      const deleted = await purgePlatform(caller.pseudonym);
      pulsePurgedRecordsCounter.inc(deleted);
      logApp.info('[Pulse] Platform contributions purged', {
        deletedRecords: deleted,
      });
      return {
        success: true,
        deleted_records: PulseStats.clampToGraphQLInt(deleted),
      };
    }),

  cleanExpiredSalts: async (now: Date = PulseClock.now()): Promise<number> => {
    const cutoff = PulseDay.addDays(
      PulseDay.today(now),
      -(PULSE_SALT_RETENTION_DAYS - 1)
    );
    const deleted = await PulseDomain.deleteSaltsBefore(cutoff);
    for (const day of [...saltCache.keys()]) {
      if (day < cutoff) {
        saltCache.delete(day);
      }
    }
    logApp.info('[Pulse] Expired salts cleaned', { deleted, cutoff });
    return deleted;
  },

  // Runs even when the service is disabled: data must never outlive the
  // retention period.
  applyRetention: async (now: Date = PulseClock.now()): Promise<void> => {
    const { retentionMonths } = PulseConfig.get();
    if (retentionMonths === null) {
      logApp.error(
        '[Pulse] Retention skipped: PULSE_RETENTION_MONTHS is invalid'
      );
      return;
    }
    const cutoff = PulseDay.retentionStart(
      PulseDay.today(now),
      retentionMonths
    );
    const deleted: Record<string, number> = {};
    for (const table of [
      'PulseContribution',
      'PulseDailyAggregate',
      'PulsePlatformDailyTotal',
    ] as const) {
      deleted[table] = await deleteInBatches(() =>
        PulseDomain.deleteRowsBeforeDay({
          table,
          day: cutoff,
          batchSize: PULSE_MAINTENANCE_BATCH_SIZE,
        })
      );
    }
    deleted.PulseKeyContributor = await deleteInBatches(() =>
      PulseDomain.deleteKeyContributorsBefore({
        day: cutoff,
        batchSize: PULSE_MAINTENANCE_BATCH_SIZE,
      })
    );
    await PulseDomain.deleteUnpublishedKeys();
    deleted.PulsePlatform = await PulseDomain.deleteInactivePlatforms(cutoff);
    await PulseDomain.refreshFirstContributionDays(cutoff);
    await invalidateSnapshots();
    for (const [table, count] of Object.entries(deleted)) {
      pulseRetentionDeletedRowsCounter.inc({ table }, count);
    }
    logApp.info('[Pulse] Retention applied', { cutoff, deleted });
  },

  cleanRateLimitBuckets: async (
    now: Date = PulseClock.now()
  ): Promise<number> => {
    const nowSeconds = Math.floor(now.getTime() / 1000);
    return PulseDomain.deleteRateLimitBucketsBefore(
      nowSeconds -
        PULSE_RATE_LIMIT_MAX_WINDOW_SECONDS -
        PULSE_RATE_LIMIT_BUCKET_SECONDS
    );
  },
};
