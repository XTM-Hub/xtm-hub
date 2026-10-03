import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import {
  PulseEventKind,
  PulseLookupInput,
  PulseObjectType,
  PulsePeriod,
  PulseRecordInput,
  PulseRegionBucket,
  PulseSectorBucket,
  PulseTrendingInput,
  PushPulseInput,
} from '../../__generated__/resolvers-types';
import { PulseErrorCode } from './pulse.errors';
import { PulseValidation } from './pulse.validation.helper';

const NOW = new Date('2026-10-03T12:00:00.000Z');
const TODAY = '2026-10-03';
const YESTERDAY = '2026-10-02';
const HASH_A = '9913881f71e8c61c79d05b20cf144d42';
const HASH_B = '541df1cb0fe4d5b0a879c3ead7dcde0f';

const makeRecord = (
  overrides: Partial<PulseRecordInput> = {}
): PulseRecordInput => ({
  hash: HASH_A,
  object_type: PulseObjectType.Indicator,
  event_kind: PulseEventKind.Created,
  count: 1,
  ...overrides,
});

const makePushInput = (
  overrides: Partial<PushPulseInput> = {}
): PushPulseInput => ({
  day: TODAY,
  sector_bucket: PulseSectorBucket.Finance,
  region_bucket: PulseRegionBucket.Europe,
  records: [makeRecord()],
  ...overrides,
});

const makeLookupInput = (
  overrides: Partial<PulseLookupInput> = {}
): PulseLookupInput => ({
  day: TODAY,
  object_type: PulseObjectType.Indicator,
  hashes: [HASH_A],
  ...overrides,
});

const makeTrendingInput = (
  overrides: Partial<PulseTrendingInput> = {}
): PulseTrendingInput => ({
  day: TODAY,
  period: PulsePeriod.Last_7Days,
  ...overrides,
});

const errorCodeOf = (call: () => unknown): unknown => {
  try {
    call();
  } catch (error) {
    return error instanceof GraphQLError ? error.extensions.code : error;
  }
  return undefined;
};

describe('pulseValidation', () => {
  describe('pushInput', () => {
    it.each([
      { description: 'a batch of today', input: makePushInput() },
      {
        description: 'a late batch of yesterday',
        input: makePushInput({ day: YESTERDAY }),
      },
      {
        description: 'the same hash with two event kinds',
        input: makePushInput({
          records: [
            makeRecord(),
            makeRecord({ event_kind: PulseEventKind.Sighted }),
          ],
        }),
      },
      {
        description: 'the largest batch and count',
        input: makePushInput({
          records: Array.from({ length: 5000 }, (_, index) =>
            makeRecord({
              hash: index.toString(16).padStart(32, '0'),
              count: 100000,
            })
          ),
        }),
      },
    ])('should accept $description', ({ input }) => {
      // When
      const validated = PulseValidation.pushInput(input, NOW);

      // Then
      expect(validated).toBe(input);
    });

    it.each([
      {
        description: 'a day two days ago',
        input: makePushInput({ day: '2026-10-01' }),
      },
      {
        description: 'a future day',
        input: makePushInput({ day: '2026-10-04' }),
      },
      {
        description: 'a malformed day',
        input: makePushInput({ day: '03/10/2026' }),
      },
      { description: 'an empty batch', input: makePushInput({ records: [] }) },
      {
        description: 'more than 5000 records',
        input: makePushInput({
          records: Array.from({ length: 5001 }, (_, index) =>
            makeRecord({ hash: index.toString(16).padStart(32, '0') })
          ),
        }),
      },
      {
        description: 'an uppercase hash',
        input: makePushInput({
          records: [makeRecord({ hash: HASH_A.toUpperCase() })],
        }),
      },
      {
        description: 'a raw value instead of a hash',
        input: makePushInput({
          records: [makeRecord({ hash: '198.51.100.7' })],
        }),
      },
      {
        description: 'a 31-character hash',
        input: makePushInput({
          records: [makeRecord({ hash: HASH_A.slice(1) })],
        }),
      },
      {
        description: 'a zero count',
        input: makePushInput({ records: [makeRecord({ count: 0 })] }),
      },
      {
        description: 'a count above 100000',
        input: makePushInput({ records: [makeRecord({ count: 100001 })] }),
      },
      {
        description: 'a fractional count',
        input: makePushInput({ records: [makeRecord({ count: 1.5 })] }),
      },
      {
        description: 'a repeated (hash, object_type, event_kind) tuple',
        input: makePushInput({
          records: [makeRecord(), makeRecord({ count: 3 })],
        }),
      },
      {
        description: 'an unknown object type',
        input: makePushInput({
          records: [
            makeRecord({ object_type: 'observable' as PulseObjectType }),
          ],
        }),
      },
      {
        description: 'an unknown sector bucket',
        input: makePushInput({
          sector_bucket: 'acme_corp' as PulseSectorBucket,
        }),
      },
    ])('should reject $description with BAD_USER_INPUT', ({ input }) => {
      // When
      const code = errorCodeOf(() => PulseValidation.pushInput(input, NOW));

      // Then
      expect(code).toBe(PulseErrorCode.BadUserInput);
    });

    it('should reject the whole batch when a single record is invalid', () => {
      // Given
      const input = makePushInput({
        records: [makeRecord(), makeRecord({ hash: HASH_B, count: -1 })],
      });

      // When
      const call = () => PulseValidation.pushInput(input, NOW);

      // Then
      expect(call).toThrow('records[1].count');
    });
  });

  describe('lookupInput', () => {
    it.each([
      { description: 'no hash', input: makeLookupInput({ hashes: [] }) },
      {
        description: 'more than 1000 hashes',
        input: makeLookupInput({ hashes: Array(1001).fill(HASH_A) }),
      },
      {
        description: 'an invalid hash',
        input: makeLookupInput({ hashes: [HASH_A, 'lockbit'] }),
      },
      {
        description: 'an old day',
        input: makeLookupInput({ day: '2026-09-01' }),
      },
    ])('should reject $description with BAD_USER_INPUT', ({ input }) => {
      // When
      const code = errorCodeOf(() => PulseValidation.lookupInput(input, NOW));

      // Then
      expect(code).toBe(PulseErrorCode.BadUserInput);
    });

    it('should accept 1000 hashes', () => {
      // Given
      const input = makeLookupInput({ hashes: Array(1000).fill(HASH_A) });

      // When
      const validated = PulseValidation.lookupInput(input, NOW);

      // Then
      expect(validated.hashes).toHaveLength(1000);
    });
  });

  describe('trendingInput', () => {
    it('should default first to 50 and scope to the whole network', () => {
      // When
      const validated = PulseValidation.trendingInput(makeTrendingInput(), NOW);

      // Then
      expect(validated).toEqual({
        day: TODAY,
        period: PulsePeriod.Last_7Days,
        sectorBucket: null,
        regionBucket: null,
        objectTypes: null,
        first: 50,
      });
    });

    it('should keep the requested buckets and object types', () => {
      // Given
      const input = makeTrendingInput({
        sector_bucket: PulseSectorBucket.Healthcare,
        region_bucket: PulseRegionBucket.NorthAmerica,
        object_types: [PulseObjectType.Malware, PulseObjectType.Tool],
        first: 200,
      });

      // When
      const validated = PulseValidation.trendingInput(input, NOW);

      // Then
      expect(validated).toMatchObject({
        sectorBucket: PulseSectorBucket.Healthcare,
        regionBucket: PulseRegionBucket.NorthAmerica,
        objectTypes: new Set([PulseObjectType.Malware, PulseObjectType.Tool]),
        first: 200,
      });
    });

    it.each([
      {
        description: 'first above 200',
        input: makeTrendingInput({ first: 201 }),
      },
      { description: 'first at 0', input: makeTrendingInput({ first: 0 }) },
      {
        description: 'an empty object types list',
        input: makeTrendingInput({ object_types: [] }),
      },
      {
        description: 'a repeated object type',
        input: makeTrendingInput({
          object_types: [PulseObjectType.Malware, PulseObjectType.Malware],
        }),
      },
      {
        description: 'an unknown period',
        input: makeTrendingInput({ period: 'last_year' as PulsePeriod }),
      },
    ])('should reject $description with BAD_USER_INPUT', ({ input }) => {
      // When
      const code = errorCodeOf(() => PulseValidation.trendingInput(input, NOW));

      // Then
      expect(code).toBe(PulseErrorCode.BadUserInput);
    });
  });

  describe('benchmarkInput', () => {
    it('should reject a day outside today and yesterday', () => {
      // Given
      const input = {
        platformId: 'platform',
        day: '2026-09-30',
        period: PulsePeriod.Last_30Days,
      };

      // When
      const code = errorCodeOf(() =>
        PulseValidation.benchmarkInput(input, NOW)
      );

      // Then
      expect(code).toBe(PulseErrorCode.BadUserInput);
    });
  });

  describe('digestInput', () => {
    it('should read a digest without a sector as the network trending', () => {
      expect(
        PulseValidation.digestInput({ day: TODAY, sector_bucket: null }, NOW)
      ).toEqual({ day: TODAY, sectorBucket: null, regionBucket: null });
    });

    it('should keep the sector and default the region to every region', () => {
      // When
      const validated = PulseValidation.digestInput(
        { day: YESTERDAY, sector_bucket: PulseSectorBucket.Healthcare },
        NOW
      );

      // Then
      expect(validated).toEqual({
        day: YESTERDAY,
        sectorBucket: PulseSectorBucket.Healthcare,
        regionBucket: null,
      });
    });

    it.each([
      {
        description: 'a day outside today and yesterday',
        input: { day: '2026-09-30', sector_bucket: PulseSectorBucket.Finance },
      },
      {
        description: 'an unknown sector',
        input: { day: TODAY, sector_bucket: 'oil' as PulseSectorBucket },
      },
      {
        description: 'an unknown region',
        input: {
          day: TODAY,
          sector_bucket: PulseSectorBucket.Finance,
          region_bucket: 'atlantis' as PulseRegionBucket,
        },
      },
    ])('should reject $description', ({ input }) => {
      // When
      const code = errorCodeOf(() => PulseValidation.digestInput(input, NOW));

      // Then
      expect(code).toBe(PulseErrorCode.BadUserInput);
    });
  });
});
