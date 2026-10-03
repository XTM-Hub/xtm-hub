import { describe, expect, it } from 'vitest';
import type { PulseRawConfig } from '../../config';
import { resolvePulseConfig } from './pulse.config.helper';

const AT_REST_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const PLATFORM_KEY =
  'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
const DEVELOPMENT_AT_REST_KEY =
  'a7e5d3c1b9f7e5d3c1b9f7e5d3c1b9f7a7e5d3c1b9f7e5d3c1b9f7e5d3c1b9f7';
const DEVELOPMENT_PLATFORM_KEY =
  '5f3d1b9f7e5d3c1b9f7e5d3c1b9f7e5d5f3d1b9f7e5d3c1b9f7e5d3c1b9f7e5d';

const makeRawConfig = (
  overrides: Partial<PulseRawConfig> = {}
): PulseRawConfig => ({
  enabled: true,
  at_rest_key: AT_REST_KEY,
  platform_key: PLATFORM_KEY,
  k_threshold: 5,
  retention_months: 13,
  contribution_window_days: 7,
  contribution_grace_days: 14,
  digest_size: 5000,
  trending_cache_ttl_minutes: 60,
  rate_limits: {
    push_pulse: 120,
    pulse_lookup: 600,
    pulse_trending: 60,
    pulse_benchmark: 30,
    pulse_salt: 120,
    pulse_status: 120,
    pulse_digest: 24,
    pulse_purge: 5,
  },
  ...overrides,
});

describe('resolvePulseConfig', () => {
  it('should enable the service with the contract defaults', () => {
    // When
    const config = resolvePulseConfig(makeRawConfig(), 'production');

    // Then
    expect(config).toMatchObject({
      enabled: true,
      settings: {
        kThreshold: 5,
        retentionMonths: 13,
        contributionWindowDays: 7,
        contributionGraceDays: 14,
        digestSize: 5000,
        trendingCacheTtlMinutes: 60,
        rateLimits: {
          push_pulse: 120,
          pulse_lookup: 600,
          pulse_trending: 60,
          pulse_benchmark: 30,
          pulse_salt: 120,
          pulse_status: 120,
          pulse_digest: 24,
          pulse_purge: 5,
        },
      },
    });
  });

  it('should decode the secrets as 32-byte keys', () => {
    // When
    const config = resolvePulseConfig(makeRawConfig(), 'production');

    // Then
    expect(
      config.enabled && {
        atRestKey: config.secrets.atRestKey.toString('hex'),
        platformKey: config.secrets.platformKey.toString('hex'),
      }
    ).toEqual({ atRestKey: AT_REST_KEY, platformKey: PLATFORM_KEY });
  });

  it('should parse numeric values coming from environment variables', () => {
    // When
    const config = resolvePulseConfig(
      makeRawConfig({ k_threshold: '7', retention_months: '24' }),
      'production'
    );

    // Then
    expect(config.settings).toMatchObject({
      kThreshold: 7,
      retentionMonths: 24,
    });
  });

  it.each([
    {
      description: 'the secrets are missing',
      raw: makeRawConfig({ at_rest_key: null, platform_key: null }),
      environment: 'production',
      reason: 'must both be set',
    },
    {
      description: 'a secret is an empty environment variable',
      raw: makeRawConfig({ platform_key: '  ' }),
      environment: 'production',
      reason: 'must both be set',
    },
    {
      description: 'a secret is not 64 hexadecimal characters',
      raw: makeRawConfig({ at_rest_key: 'changeme' }),
      environment: 'production',
      reason: '64 hexadecimal characters',
    },
    {
      description: 'both secrets are equal',
      raw: makeRawConfig({ platform_key: AT_REST_KEY }),
      environment: 'production',
      reason: 'must differ',
    },
    {
      description: 'production uses the public development secrets',
      raw: makeRawConfig({
        at_rest_key: DEVELOPMENT_AT_REST_KEY,
        platform_key: DEVELOPMENT_PLATFORM_KEY,
      }),
      environment: 'production',
      reason: 'public development secrets',
    },
    {
      description: 'staging uses a public development secret',
      raw: makeRawConfig({ platform_key: DEVELOPMENT_PLATFORM_KEY }),
      environment: 'staging',
      reason: 'public development secrets',
    },
  ])(
    'should disable the service with an error when $description',
    ({ raw, environment, reason }) => {
      // When
      const config = resolvePulseConfig(raw, environment);

      // Then
      expect(config).toMatchObject({
        enabled: false,
        severity: 'error',
        reason: expect.stringContaining(reason),
      });
    }
  );

  it('should accept the development secrets in development', () => {
    // When
    const config = resolvePulseConfig(
      makeRawConfig({
        at_rest_key: DEVELOPMENT_AT_REST_KEY,
        platform_key: DEVELOPMENT_PLATFORM_KEY,
      }),
      'development'
    );

    // Then
    expect(config.enabled).toBe(true);
  });

  it('should report an explicit opt-out as information', () => {
    // When
    const config = resolvePulseConfig(
      makeRawConfig({ enabled: false }),
      'production'
    );

    // Then
    expect(config).toMatchObject({ enabled: false, severity: 'info' });
  });

  it.each([
    { description: 'k below 2', raw: makeRawConfig({ k_threshold: 1 }) },
    { description: 'a fractional k', raw: makeRawConfig({ k_threshold: 4.5 }) },
    {
      description: 'no retention',
      raw: makeRawConfig({ retention_months: 0 }),
    },
    {
      description: 'a contribution window above one year',
      raw: makeRawConfig({ contribution_window_days: 366 }),
    },
    {
      description: 'a grace period shorter than the contribution window',
      raw: makeRawConfig({
        contribution_window_days: 14,
        contribution_grace_days: 7,
      }),
    },
    {
      description: 'a digest below 100 keys',
      raw: makeRawConfig({ digest_size: 99 }),
    },
    {
      description: 'a digest above 20000 keys',
      raw: makeRawConfig({ digest_size: 20_001 }),
    },
    {
      description: 'a missing rate limit',
      raw: makeRawConfig({ rate_limits: { push_pulse: 120 } }),
    },
    {
      description: 'a non numeric rate limit',
      raw: makeRawConfig({
        rate_limits: { ...makeRawConfig().rate_limits, pulse_lookup: 'many' },
      }),
    },
  ])(
    'should disable the service without settings when $description',
    ({ raw }) => {
      // When
      const config = resolvePulseConfig(raw, 'production');

      // Then
      expect(config).toMatchObject({ enabled: false, settings: null });
    }
  );

  it('should keep the settings for the retention job when only secrets are missing', () => {
    // When
    const config = resolvePulseConfig(
      makeRawConfig({ at_rest_key: null }),
      'production'
    );

    // Then
    expect(config.settings?.retentionMonths).toBe(13);
    expect(config.retentionMonths).toBe(13);
  });

  it('should keep a valid retention period when an unrelated setting is invalid', () => {
    // When
    const config = resolvePulseConfig(
      makeRawConfig({
        rate_limits: { ...makeRawConfig().rate_limits, push_pulse: 0 },
      }),
      'production'
    );

    // Then
    expect(config).toMatchObject({
      enabled: false,
      settings: null,
      retentionMonths: 13,
    });
  });

  it('should give the retention job no period when the retention itself is invalid', () => {
    // When
    const config = resolvePulseConfig(
      makeRawConfig({ retention_months: 0 }),
      'production'
    );

    // Then
    expect(config).toMatchObject({ enabled: false, retentionMonths: null });
  });
});
