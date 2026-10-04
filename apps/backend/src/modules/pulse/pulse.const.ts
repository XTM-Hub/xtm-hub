import {
  PulseEventKind,
  PulseObjectType,
  PulsePeriod,
} from '../../__generated__/resolvers-types';

export const PULSE_HASH_PATTERN = /^[0-9a-f]{32}$/;
export const PULSE_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const PULSE_MIN_RECORDS_PER_BATCH = 1;
export const PULSE_MAX_RECORDS_PER_BATCH = 5000;
export const PULSE_MIN_RECORD_COUNT = 1;
export const PULSE_MAX_RECORD_COUNT = 100000;
export const PULSE_MIN_LOOKUP_HASHES = 1;
export const PULSE_MAX_LOOKUP_HASHES = 1000;
export const PULSE_DEFAULT_TRENDING_FIRST = 50;
export const PULSE_MAX_TRENDING_FIRST = 200;
export const PULSE_MAX_BENCHMARK_ITEMS = 50;

// Prevalence, active contributors and the sector gate always look at 30 days.
export const PULSE_ACTIVITY_WINDOW_DAYS = 30;
export const PULSE_TREND_SERIES_WEEKS = 12;
export const PULSE_TREND_BASELINE_WEEKS = 3;
export const PULSE_DAYS_PER_WEEK = 7;

export const PULSE_SALT_BYTES = 16;
export const PULSE_SECRET_BYTES = 32;
// Salts live 3 UTC days: the current day and the two previous ones (requests
// only use the current or the previous day); older salts are deleted.
export const PULSE_SALT_RETENTION_DAYS = 3;

// Snapshots keep the best ranked items of every object type so that any
// object_types filter can still be answered with `first` up to 200.
export const PULSE_TRENDING_ITEMS_PER_OBJECT_TYPE = PULSE_MAX_TRENDING_FIRST;
export const PULSE_SCOPE_ALL = 'all';

export const PULSE_MAINTENANCE_BATCH_SIZE = 5000;
export const PULSE_PUSH_DEADLOCK_ATTEMPTS = 3;

export const PULSE_PERIOD_DAYS: Record<PulsePeriod, number> = {
  [PulsePeriod.Last_7Days]: 7,
  [PulsePeriod.Last_30Days]: 30,
  [PulsePeriod.Last_90Days]: 90,
};

// Contract declaration order, used for deterministic outputs.
export const PULSE_OBJECT_TYPES: readonly PulseObjectType[] = [
  PulseObjectType.Indicator,
  PulseObjectType.AttackPattern,
  PulseObjectType.Vulnerability,
  PulseObjectType.IntrusionSet,
  PulseObjectType.Malware,
  PulseObjectType.Tool,
];

export const PULSE_EVENT_KINDS: readonly PulseEventKind[] = [
  PulseEventKind.Created,
  PulseEventKind.Sighted,
  PulseEventKind.Detected,
  PulseEventKind.Hunted,
  PulseEventKind.Referenced,
];

export enum PulseOperation {
  PushPulse = 'push_pulse',
  PulseLookup = 'pulse_lookup',
  PulseTrending = 'pulse_trending',
  PulseBenchmark = 'pulse_benchmark',
  PulseSalt = 'pulse_salt',
  PulseStatus = 'pulse_status',
  PulseDigest = 'pulse_digest',
  PulsePurge = 'pulse_purge',
}

export const PULSE_OPERATIONS: readonly PulseOperation[] =
  Object.values(PulseOperation);

const ONE_HOUR_SECONDS = 60 * 60;

export const PULSE_RATE_LIMIT_WINDOW_SECONDS: Record<PulseOperation, number> = {
  [PulseOperation.PushPulse]: ONE_HOUR_SECONDS,
  [PulseOperation.PulseLookup]: ONE_HOUR_SECONDS,
  [PulseOperation.PulseTrending]: ONE_HOUR_SECONDS,
  [PulseOperation.PulseBenchmark]: ONE_HOUR_SECONDS,
  [PulseOperation.PulseSalt]: ONE_HOUR_SECONDS,
  [PulseOperation.PulseStatus]: ONE_HOUR_SECONDS,
  [PulseOperation.PulseDigest]: ONE_HOUR_SECONDS,
  [PulseOperation.PulsePurge]: 24 * ONE_HOUR_SECONDS,
};

// The preview digest: the most prevalent published keys of the network with
// their prevalence and trend only, plus the sector trending of the last 7
// days of which only the first ranks are named.
export const PULSE_DIGEST_TRENDING_PERIOD = PulsePeriod.Last_7Days;
export const PULSE_DIGEST_TRENDING_RANKS = 10;
export const PULSE_DIGEST_TRENDING_NAMED_RANKS = 3;
export const PULSE_RATE_LIMIT_BUCKET_SECONDS = 60;
export const PULSE_RATE_LIMIT_MAX_WINDOW_SECONDS = Math.max(
  ...Object.values(PULSE_RATE_LIMIT_WINDOW_SECONDS)
);

export const PULSE_PLATFORMS_BUCKETS: readonly {
  min: number;
  label: string;
}[] = [
  { min: 250, label: '250+' },
  { min: 100, label: '100-249' },
  { min: 50, label: '50-99' },
  { min: 25, label: '25-49' },
  { min: 10, label: '10-24' },
  { min: 5, label: '5-9' },
];
export const PULSE_BELOW_SMALLEST_BUCKET_LABEL = '<5';

// Bumped whenever the publication rules change (suppression, coarsening,
// ordering): trending and digest snapshots computed under another version are
// recomputed.
export const PULSE_PUBLICATION_POLICY_VERSION = 8;

// A trending or digest computation that a purge or a retention run overlapped
// is computed again, this many times at most before the request fails.
export const PULSE_SNAPSHOT_COMPUTE_ATTEMPTS = 3;

export const PULSE_PREVALENCE_RARE_BELOW = 0.02;
export const PULSE_PREVALENCE_UNCOMMON_BELOW = 0.1;
export const PULSE_PREVALENCE_COMMON_BELOW = 0.3;

export const PULSE_TREND_RISING_RATIO = 1.5;
export const PULSE_TREND_FALLING_RATIO = 0.67;
export const PULSE_TREND_MIN_DELTA = 2;

export const PULSE_GRAPHQL_INT_MAX = 2147483647;

export const PULSE_LOCK_PLATFORM = 'pulse-platform';
export const PULSE_LOCK_RATE_LIMIT = 'pulse-rate-limit';
export const PULSE_LOCK_TRENDING = 'pulse-trending';
export const PULSE_LOCK_DIGEST = 'pulse-digest';
export const PULSE_LOCK_SALT = 'pulse-salt';
