import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES } from '../../../tests/tests.const';
import {
  PlatformConfigurationStatus,
  PulseEventKind,
  PulseObjectType,
  PulsePeriod,
  PulseRegionBucket,
  PulseSectorBucket,
} from '../../__generated__/resolvers-types';
import { PulseConfig } from './pulse.config';
import { PulseOperation } from './pulse.const';
import { PulseDay } from './pulse.day.helper';
import { PulseErrorCode } from './pulse.errors';
import {
  cleanPulseState,
  errorCodes,
  executePulse,
  PULSE_INTEGRATION_SUITE,
  PULSE_SALT_QUERY,
  PULSE_STATUS_QUERY,
  PULSE_TEST_TODAY,
  PULSE_TEST_YESTERDAY,
  pulseClient,
  PulseTestClient,
  PUSH_PULSE_MUTATION,
  usePulseClock,
} from './test/pulse.test.utils';

const IP_VALUE = 'observable:ipv4-addr:value:198.51.100.7';
const CVE_VALUE = 'CVE-2024-3400';
const VALID_HASH = '9913881f71e8c61c79d05b20cf144d42';

const registerClient = async (
  options?: Parameters<typeof TestHelper.pulse.registerPlatform>[0]
): Promise<PulseTestClient> =>
  pulseClient(await TestHelper.pulse.registerPlatform(options));

const withPulseSettings = (
  overrides: Partial<{ rateLimits: Partial<Record<PulseOperation, number>> }>
) => {
  const config = PulseConfig.get();
  if (!config.enabled) {
    throw new Error('Threat Pulse must be enabled in tests');
  }
  vi.spyOn(PulseConfig, 'get').mockReturnValue({
    ...config,
    settings: {
      ...config.settings,
      rateLimits: { ...config.settings.rateLimits, ...overrides.rateLimits },
    },
  });
};

describe('pulseApp platform API', PULSE_INTEGRATION_SUITE, () => {
  beforeEach(() => {
    usePulseClock();
  });

  afterEach(async () => {
    await cleanPulseState();
  });

  describe('authentication', () => {
    it('should answer UNAUTHENTICATED without platform headers', async () => {
      // When
      const result = await executePulse({ query: PULSE_STATUS_QUERY });

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.Unauthenticated]);
    });

    it('should answer UNAUTHENTICATED with an unknown platform token', async () => {
      // Given
      const platform = await TestHelper.pulse.registerPlatform();

      // When
      const result = await executePulse({
        query: PULSE_STATUS_QUERY,
        platform: {
          ...platform,
          token: '00000000-0000-4000-8000-000000000000',
        },
      });

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.Unauthenticated]);
    });

    it('should answer UNAUTHENTICATED when the registration is not active', async () => {
      // Given
      const client = await registerClient({
        status: PlatformConfigurationStatus.Inactive,
      });

      // When
      const result = await client.statusResult();

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.Unauthenticated]);
    });

    it('should answer FORBIDDEN to a platform that is not OpenCTI', async () => {
      // Given
      const client = await registerClient({
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
      });

      // When
      const result = await client.statusResult();

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.Forbidden]);
    });

    it('should answer PULSE_DISABLED when the service is not configured', async () => {
      // Given
      const client = await registerClient();
      vi.spyOn(PulseConfig, 'get').mockReturnValue({
        enabled: false,
        reason: 'secrets missing',
        severity: 'error',
        settings: null,
      });

      // When
      const result = await client.statusResult();

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.Disabled]);
    });
  });

  describe('pulseSalt', () => {
    it('should serve one salt per UTC day to every platform', async () => {
      // Given
      const first = await registerClient();
      const second = await registerClient();

      // When
      const firstSalt = await first.salt(PULSE_TEST_TODAY);
      const secondSalt = await second.salt(PULSE_TEST_TODAY);

      // Then
      expect({ firstSalt, sameSalt: firstSalt === secondSalt }).toEqual({
        firstSalt: expect.stringMatching(/^[0-9a-f]{32}$/),
        sameSalt: true,
      });
    });

    it('should serve a different salt for yesterday to accept late batches', async () => {
      // Given
      const client = await registerClient();

      // When
      const today = await client.salt(PULSE_TEST_TODAY);
      const yesterday = await client.salt(PULSE_TEST_YESTERDAY);

      // Then
      expect(yesterday).not.toBe(today);
    });

    it.each(['2026-10-01', '2026-10-04', 'today'])(
      'should reject the day %s with BAD_USER_INPUT',
      async (day) => {
        // Given
        const client = await registerClient();

        // When
        const result = await executePulse({
          query: PULSE_SALT_QUERY,
          variables: { day },
          platform: client.platform,
        });

        // Then
        expect(errorCodes(result)).toEqual([PulseErrorCode.BadUserInput]);
      }
    );
  });

  describe('pushPulse', () => {
    it('should accept a batch and echo its day', async () => {
      // Given
      const client = await registerClient();

      // When
      const result = await client.push({
        day: PULSE_TEST_TODAY,
        records: [
          { objectType: PulseObjectType.Indicator, value: IP_VALUE, count: 3 },
          {
            objectType: PulseObjectType.Vulnerability,
            value: CVE_VALUE,
            eventKind: PulseEventKind.Sighted,
          },
        ],
      });

      // Then
      expect(result).toEqual({ accepted: 2, day: PULSE_TEST_TODAY });
    });

    it('should never store transport hashes, stable keys or the raw platform id', async () => {
      // Given
      const client = await registerClient();
      const salt = await client.salt(PULSE_TEST_TODAY);
      const stableKey = TestHelper.pulse
        .stableKey(PulseObjectType.Indicator, IP_VALUE)
        .toString('hex');
      const transportHash = TestHelper.pulse.hashValue(
        PulseObjectType.Indicator,
        IP_VALUE,
        salt
      );

      // When
      await client.push({
        day: PULSE_TEST_TODAY,
        records: [{ objectType: PulseObjectType.Indicator, value: IP_VALUE }],
      });

      // Then
      const dump = await TestHelper.pulse.dumpTables();
      expect(
        [
          transportHash,
          stableKey,
          client.platform.platformId,
          client.platform.token,
          IP_VALUE,
        ].filter((secret) => dump.includes(secret))
      ).toEqual([]);
    });

    it('should sum repeated pushes and count the platform once per day', async () => {
      // Given
      const client = await registerClient();
      const records = [
        { objectType: PulseObjectType.Indicator, value: IP_VALUE, count: 2 },
      ];

      // When
      await client.push({ day: PULSE_TEST_TODAY, records });
      await client.push({ day: PULSE_TEST_TODAY, records });

      // Then
      expect(await TestHelper.pulse.loadDailyAggregates()).toEqual([
        {
          day: PULSE_TEST_TODAY,
          platform_count: 1,
          created_count: '4',
          sighted_count: '0',
        },
      ]);
    });

    it('should count every distinct platform in the daily aggregate', async () => {
      // Given
      const first = await registerClient();
      const second = await registerClient();
      const records = [
        { objectType: PulseObjectType.Indicator, value: IP_VALUE },
      ];

      // When
      await first.push({ day: PULSE_TEST_TODAY, records });
      await second.push({ day: PULSE_TEST_TODAY, records });

      // Then
      expect(await TestHelper.pulse.loadKeyPlatformCounts()).toEqual([2]);
    });

    it('should link the same value pushed on two days under two salts', async () => {
      // Given
      const client = await registerClient();
      const records = [
        { objectType: PulseObjectType.Indicator, value: IP_VALUE },
      ];

      // When
      await client.push({ day: PULSE_TEST_YESTERDAY, records });
      await client.push({ day: PULSE_TEST_TODAY, records });

      // Then
      expect({
        keys: await TestHelper.pulse.countRows('PulseKey'),
        days: await TestHelper.pulse.loadContributionDays(),
      }).toEqual({ keys: 1, days: [PULSE_TEST_YESTERDAY, PULSE_TEST_TODAY] });
    });

    it.each([
      {
        description: 'a raw value instead of a hash',
        records: [
          {
            hash: '198.51.100.7',
            object_type: PulseObjectType.Indicator,
            event_kind: PulseEventKind.Created,
            count: 1,
          },
        ],
      },
      {
        description: 'a count above 100000',
        records: [
          {
            hash: VALID_HASH,
            object_type: PulseObjectType.Indicator,
            event_kind: PulseEventKind.Created,
            count: 100001,
          },
        ],
      },
      {
        description: 'a duplicated tuple next to a valid record',
        records: [
          {
            hash: VALID_HASH,
            object_type: PulseObjectType.Indicator,
            event_kind: PulseEventKind.Created,
            count: 1,
          },
          {
            hash: VALID_HASH,
            object_type: PulseObjectType.Indicator,
            event_kind: PulseEventKind.Created,
            count: 2,
          },
        ],
      },
      {
        description: 'an unknown object type',
        records: [
          {
            hash: VALID_HASH,
            object_type: 'observable',
            event_kind: PulseEventKind.Created,
            count: 1,
          },
        ],
      },
      {
        description: 'an extra value field on a record',
        records: [
          {
            hash: VALID_HASH,
            object_type: PulseObjectType.Indicator,
            event_kind: PulseEventKind.Created,
            count: 1,
            value: '198.51.100.7',
          },
        ],
      },
    ])(
      'should reject $description with BAD_USER_INPUT and store nothing',
      async ({ records }) => {
        // Given
        const client = await registerClient();
        await client.salt(PULSE_TEST_TODAY);

        // When
        const result = await executePulse({
          query: PUSH_PULSE_MUTATION,
          variables: {
            input: {
              day: PULSE_TEST_TODAY,
              sector_bucket: PulseSectorBucket.Finance,
              region_bucket: PulseRegionBucket.Europe,
              records,
            },
          },
          platform: client.platform,
        });

        // Then
        expect({
          codes: errorCodes(result),
          stored: await TestHelper.pulse.countRows('PulseContribution'),
        }).toEqual({ codes: [PulseErrorCode.BadUserInput], stored: 0 });
      }
    );

    it('should reject an extra name field on the batch with BAD_USER_INPUT', async () => {
      // Given
      const client = await registerClient();
      await client.salt(PULSE_TEST_TODAY);

      // When
      const result = await executePulse({
        query: PUSH_PULSE_MUTATION,
        variables: {
          input: {
            day: PULSE_TEST_TODAY,
            sector_bucket: PulseSectorBucket.Finance,
            region_bucket: PulseRegionBucket.Europe,
            name: 'ACME Bank',
            records: [
              {
                hash: VALID_HASH,
                object_type: PulseObjectType.Indicator,
                event_kind: PulseEventKind.Created,
                count: 1,
              },
            ],
          },
        },
        platform: client.platform,
      });

      // Then
      expect({
        codes: errorCodes(result),
        message: result.errors?.[0]?.message,
      }).toEqual({
        codes: [PulseErrorCode.BadUserInput],
        message: expect.stringContaining('Field "name" is not defined'),
      });
    });

    it('should reject an inline extra field before any resolver runs', async () => {
      // Given
      const client = await registerClient();
      await client.salt(PULSE_TEST_TODAY);

      // When
      const result = await executePulse({
        query: `mutation {
          pushPulse(input: {
            day: "${PULSE_TEST_TODAY}", sector_bucket: finance, region_bucket: europe,
            records: [{ hash: "${VALID_HASH}", object_type: indicator, event_kind: created, count: 1, value: "198.51.100.7" }]
          }) { accepted day }
        }`,
        platform: client.platform,
      });

      // Then
      expect({
        message: result.errors?.[0]?.message,
        stored: await TestHelper.pulse.countRows('PulseContribution'),
      }).toEqual({
        message: expect.stringContaining('Field "value" is not defined'),
        stored: 0,
      });
    });

    it('should reject a batch for a day whose salt was never issued', async () => {
      // Given a platform that only fetched the salt of today
      const client = await registerClient();
      const salt = await client.salt(PULSE_TEST_TODAY);
      const clock = usePulseClock('2026-11-20T10:00:00.000Z');

      // When it pushes yesterday's hashes without asking yesterday's salt
      const result = await executePulse({
        query: PUSH_PULSE_MUTATION,
        variables: {
          input: {
            day: PulseDay.addDays(clock.today(), -1),
            sector_bucket: PulseSectorBucket.Finance,
            region_bucket: PulseRegionBucket.Europe,
            records: [
              {
                hash: TestHelper.pulse.hashValue(
                  PulseObjectType.Indicator,
                  IP_VALUE,
                  salt
                ),
                object_type: PulseObjectType.Indicator,
                event_kind: PulseEventKind.Created,
                count: 1,
              },
            ],
          },
        },
        platform: client.platform,
      });

      // Then
      expect(errorCodes(result)).toEqual([PulseErrorCode.BadUserInput]);
    });
  });

  describe('pulseStatus', () => {
    it('should describe the service to a platform that never contributed', async () => {
      // Given
      const client = await registerClient();

      // When
      const status = await client.status();

      // Then
      expect(status).toEqual({
        day: PULSE_TEST_TODAY,
        k_threshold: 5,
        retention_months: 13,
        contributors_bucket: '<5',
        read_access: false,
        last_contribution_day: null,
      });
    });

    it('should grant read access after a contribution', async () => {
      // Given
      const client = await registerClient();
      await client.push({
        day: PULSE_TEST_YESTERDAY,
        records: [{ objectType: PulseObjectType.Malware, value: 'lockbit' }],
      });

      // When
      const status = await client.status();

      // Then
      expect(status).toMatchObject({
        read_access: true,
        last_contribution_day: PULSE_TEST_YESTERDAY,
      });
    });
  });

  describe('contribute to read', () => {
    it.each([
      {
        operation: 'pulseLookup',
        read: (client: PulseTestClient) =>
          client.lookupResult({
            day: PULSE_TEST_TODAY,
            objectType: PulseObjectType.Malware,
            values: ['lockbit'],
          }),
      },
      {
        operation: 'pulseTrending',
        read: (client: PulseTestClient) =>
          client.trendingResult({
            day: PULSE_TEST_TODAY,
            period: PulsePeriod.Last_7Days,
          }),
      },
      {
        operation: 'pulseBenchmark',
        read: (client: PulseTestClient) =>
          client.benchmarkResult({
            day: PULSE_TEST_TODAY,
            period: PulsePeriod.Last_30Days,
          }),
      },
    ])(
      'should answer PULSE_CONTRIBUTION_REQUIRED to $operation without contribution',
      async ({ read }) => {
        // Given
        const client = await registerClient();

        // When
        const result = await read(client);

        // Then
        expect(errorCodes(result)).toEqual([
          PulseErrorCode.ContributionRequired,
        ]);
      }
    );

    it.each([
      { daysLater: 29, expectedCodes: [] },
      { daysLater: 30, expectedCodes: [PulseErrorCode.ContributionRequired] },
    ])(
      'should evaluate read access over 30 days ($daysLater days after the contribution)',
      async ({ daysLater, expectedCodes }) => {
        // Given
        const clock = usePulseClock();
        const client = await registerClient();
        await client.push({
          day: PULSE_TEST_TODAY,
          records: [{ objectType: PulseObjectType.Malware, value: 'lockbit' }],
        });
        clock.addDays(daysLater);

        // When
        const result = await client.lookupResult({
          day: clock.today(),
          objectType: PulseObjectType.Malware,
          values: ['lockbit'],
        });

        // Then
        expect(errorCodes(result)).toEqual(expectedCodes);
      }
    );
  });

  describe('rate limits', () => {
    it('should answer PULSE_RATE_LIMITED with retry_after_seconds once the hourly limit is reached', async () => {
      // Given
      withPulseSettings({ rateLimits: { [PulseOperation.PulseStatus]: 2 } });
      const client = await registerClient();
      await client.status();
      await client.status();

      // When
      const result = await client.statusResult();

      // Then
      expect(result.errors?.[0]?.extensions).toMatchObject({
        code: PulseErrorCode.RateLimited,
        retry_after_seconds: 3600,
      });
    });

    it('should count every platform separately', async () => {
      // Given
      withPulseSettings({ rateLimits: { [PulseOperation.PulseStatus]: 1 } });
      const first = await registerClient();
      const second = await registerClient();
      await first.status();

      // When
      const result = await second.statusResult();

      // Then
      expect(result.errors).toBeUndefined();
    });

    it('should accept requests again once the rolling hour has passed', async () => {
      // Given
      withPulseSettings({ rateLimits: { [PulseOperation.PulseStatus]: 1 } });
      const clock = usePulseClock();
      const client = await registerClient();
      await client.status();
      clock.addMinutes(61);

      // When
      const result = await client.statusResult();

      // Then
      expect(result.errors).toBeUndefined();
    });
  });
});
