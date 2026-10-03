import type { PulseRawConfig } from '../../config';
import { getErrorMessage } from '../../utils/error/error-guard.util';
import { PULSE_SECRET_BYTES, PulseOperation } from './pulse.const';

export interface PulseSettings {
  kThreshold: number;
  retentionMonths: number;
  contributionWindowDays: number;
  trendingCacheTtlMinutes: number;
  rateLimits: Record<PulseOperation, number>;
}

export interface PulseSecrets {
  atRestKey: Buffer;
  platformKey: Buffer;
}

export type PulseRuntimeConfig =
  | { enabled: true; settings: PulseSettings; secrets: PulseSecrets }
  | {
      enabled: false;
      reason: string;
      severity: 'info' | 'error';
      settings: PulseSettings | null;
    };

export const PULSE_RECOMMENDED_MIN_K_THRESHOLD = 5;

const MIN_K_THRESHOLD = 2;
const SECRET_PATTERN = new RegExp(`^[0-9a-f]{${PULSE_SECRET_BYTES * 2}}$`);
const NON_PRODUCTION_ENVIRONMENTS = new Set(['development', 'test']);

// Deterministic keys of config/development.json and config/test.json. They
// are public, so a production or staging Hub must never run with them.
const DEVELOPMENT_SECRETS = new Set([
  'a7e5d3c1b9f7e5d3c1b9f7e5d3c1b9f7a7e5d3c1b9f7e5d3c1b9f7e5d3c1b9f7',
  '5f3d1b9f7e5d3c1b9f7e5d3c1b9f7e5d5f3d1b9f7e5d3c1b9f7e5d3c1b9f7e5d',
]);

const SETTINGS_RANGES = {
  k_threshold: { min: MIN_K_THRESHOLD, max: 1000 },
  retention_months: { min: 1, max: 120 },
  contribution_window_days: { min: 1, max: 365 },
  trending_cache_ttl_minutes: { min: 1, max: 1440 },
  rate_limit: { min: 1, max: 1_000_000 },
} as const;

const readInteger = (
  name: string,
  value: unknown,
  { min, max }: { min: number; max: number }
): number => {
  const parsed =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (
    typeof parsed !== 'number' ||
    !Number.isInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    throw new Error(
      `pulse.${name} must be an integer between ${min} and ${max}`
    );
  }
  return parsed;
};

const readBoolean = (name: string, value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  throw new Error(`pulse.${name} must be a boolean`);
};

const readSecret = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('Threat Pulse secrets must be strings');
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.toLowerCase();
};

const readRateLimit = (raw: PulseRawConfig, operation: PulseOperation) =>
  readInteger(
    `rate_limits.${operation}`,
    raw.rate_limits?.[operation],
    SETTINGS_RANGES.rate_limit
  );

const readSettings = (raw: PulseRawConfig): PulseSettings => ({
  kThreshold: readInteger(
    'k_threshold',
    raw.k_threshold,
    SETTINGS_RANGES.k_threshold
  ),
  retentionMonths: readInteger(
    'retention_months',
    raw.retention_months,
    SETTINGS_RANGES.retention_months
  ),
  contributionWindowDays: readInteger(
    'contribution_window_days',
    raw.contribution_window_days,
    SETTINGS_RANGES.contribution_window_days
  ),
  trendingCacheTtlMinutes: readInteger(
    'trending_cache_ttl_minutes',
    raw.trending_cache_ttl_minutes,
    SETTINGS_RANGES.trending_cache_ttl_minutes
  ),
  rateLimits: {
    [PulseOperation.PushPulse]: readRateLimit(raw, PulseOperation.PushPulse),
    [PulseOperation.PulseLookup]: readRateLimit(
      raw,
      PulseOperation.PulseLookup
    ),
    [PulseOperation.PulseTrending]: readRateLimit(
      raw,
      PulseOperation.PulseTrending
    ),
    [PulseOperation.PulseBenchmark]: readRateLimit(
      raw,
      PulseOperation.PulseBenchmark
    ),
    [PulseOperation.PulseSalt]: readRateLimit(raw, PulseOperation.PulseSalt),
    [PulseOperation.PulseStatus]: readRateLimit(
      raw,
      PulseOperation.PulseStatus
    ),
    [PulseOperation.PulsePurge]: readRateLimit(raw, PulseOperation.PulsePurge),
  },
});

const disabled = (
  reason: string,
  settings: PulseSettings | null,
  severity: 'info' | 'error' = 'error'
): PulseRuntimeConfig => ({ enabled: false, reason, severity, settings });

const resolveSecrets = (
  raw: PulseRawConfig,
  environment: string
): PulseSecrets | string => {
  const atRestKey = readSecret(raw.at_rest_key);
  const platformKey = readSecret(raw.platform_key);
  if (!atRestKey || !platformKey) {
    return 'PULSE_AT_REST_KEY and PULSE_PLATFORM_KEY must both be set (64 hexadecimal characters each)';
  }
  if (!SECRET_PATTERN.test(atRestKey) || !SECRET_PATTERN.test(platformKey)) {
    return 'PULSE_AT_REST_KEY and PULSE_PLATFORM_KEY must be 64 hexadecimal characters each';
  }
  if (atRestKey === platformKey) {
    return 'PULSE_AT_REST_KEY and PULSE_PLATFORM_KEY must differ';
  }
  if (
    !NON_PRODUCTION_ENVIRONMENTS.has(environment) &&
    (DEVELOPMENT_SECRETS.has(atRestKey) || DEVELOPMENT_SECRETS.has(platformKey))
  ) {
    return `the public development secrets cannot be used in the ${environment} environment`;
  }
  return {
    atRestKey: Buffer.from(atRestKey, 'hex'),
    platformKey: Buffer.from(platformKey, 'hex'),
  };
};

// Invalid values disable the service with a reason instead of crashing the
// API; the settings stay available to the retention job whenever they parse.
export const resolvePulseConfig = (
  raw: PulseRawConfig,
  environment: string
): PulseRuntimeConfig => {
  let settings: PulseSettings;
  try {
    settings = readSettings(raw);
  } catch (error) {
    return disabled(getErrorMessage(error), null);
  }
  try {
    if (!readBoolean('enabled', raw.enabled)) {
      return disabled(
        'disabled by configuration (PULSE_ENABLED=false)',
        settings,
        'info'
      );
    }
    const secrets = resolveSecrets(raw, environment);
    if (typeof secrets === 'string') {
      return disabled(secrets, settings);
    }
    return { enabled: true, settings, secrets };
  } catch (error) {
    return disabled(getErrorMessage(error), settings);
  }
};
