import {
  PulseBenchmarkInput,
  PulseLookupInput,
  PulseObjectType,
  PulsePeriod,
  PulseRegionBucket,
  PulseSectorBucket,
  PulseTrendingInput,
  PushPulseInput,
} from '../../__generated__/resolvers-types';
import {
  PULSE_DEFAULT_TRENDING_FIRST,
  PULSE_EVENT_KINDS,
  PULSE_HASH_PATTERN,
  PULSE_MAX_LOOKUP_HASHES,
  PULSE_MAX_RECORD_COUNT,
  PULSE_MAX_RECORDS_PER_BATCH,
  PULSE_MAX_TRENDING_FIRST,
  PULSE_MIN_LOOKUP_HASHES,
  PULSE_MIN_RECORD_COUNT,
  PULSE_MIN_RECORDS_PER_BATCH,
  PULSE_OBJECT_TYPES,
  PULSE_PERIOD_DAYS,
} from './pulse.const';
import { PulseDay } from './pulse.day.helper';
import { PulseErrors } from './pulse.errors';

export interface ValidatedTrendingInput {
  day: string;
  period: PulsePeriod;
  sectorBucket: PulseSectorBucket | null;
  regionBucket: PulseRegionBucket | null;
  objectTypes: ReadonlySet<PulseObjectType> | null;
  first: number;
}

const SECTOR_BUCKETS: ReadonlySet<string> = new Set(
  Object.values(PulseSectorBucket)
);
const REGION_BUCKETS: ReadonlySet<string> = new Set(
  Object.values(PulseRegionBucket)
);
const OBJECT_TYPES: ReadonlySet<string> = new Set(PULSE_OBJECT_TYPES);
const EVENT_KINDS: ReadonlySet<string> = new Set(PULSE_EVENT_KINDS);

const assertInRange = (
  name: string,
  value: number,
  min: number,
  max: number
): void => {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw PulseErrors.badUserInput(
      `${name} must be an integer between ${min} and ${max}`
    );
  }
};

const assertEnum = (
  name: string,
  value: string,
  allowed: ReadonlySet<string>
): void => {
  if (!allowed.has(value)) {
    throw PulseErrors.badUserInput(`${name} has an unsupported value`);
  }
};

const assertHash = (name: string, hash: string): void => {
  if (!PULSE_HASH_PATTERN.test(hash)) {
    throw PulseErrors.badUserInput(`${name} must match ^[0-9a-f]{32}$`);
  }
};

const assertPeriod = (period: string): void => {
  if (!Object.hasOwn(PULSE_PERIOD_DAYS, period)) {
    throw PulseErrors.badUserInput('period has an unsupported value');
  }
};

// The whole request is rejected on the first violation: Threat Pulse never
// stores part of an invalid batch.
export const PulseValidation = {
  requestDay: (day: string, now: Date): string => {
    if (!PulseDay.isValid(day)) {
      throw PulseErrors.badUserInput('day must be a YYYY-MM-DD UTC day');
    }
    if (!PulseDay.isAcceptedRequestDay(day, now)) {
      throw PulseErrors.badUserInput(
        'day must be the current or the previous UTC day'
      );
    }
    return day;
  },

  pushInput: (input: PushPulseInput, now: Date): PushPulseInput => {
    PulseValidation.requestDay(input.day, now);
    assertEnum('sector_bucket', input.sector_bucket, SECTOR_BUCKETS);
    assertEnum('region_bucket', input.region_bucket, REGION_BUCKETS);
    assertInRange(
      'records length',
      input.records.length,
      PULSE_MIN_RECORDS_PER_BATCH,
      PULSE_MAX_RECORDS_PER_BATCH
    );
    const seen = new Set<string>();
    input.records.forEach((record, index) => {
      assertHash(`records[${index}].hash`, record.hash);
      assertEnum(`records[${index}].object_type`, record.object_type, OBJECT_TYPES);
      assertEnum(`records[${index}].event_kind`, record.event_kind, EVENT_KINDS);
      assertInRange(
        `records[${index}].count`,
        record.count,
        PULSE_MIN_RECORD_COUNT,
        PULSE_MAX_RECORD_COUNT
      );
      const uniqueKey = `${record.hash}:${record.object_type}:${record.event_kind}`;
      if (seen.has(uniqueKey)) {
        throw PulseErrors.badUserInput(
          `records[${index}] repeats a (hash, object_type, event_kind) tuple of the batch`
        );
      }
      seen.add(uniqueKey);
    });
    return input;
  },

  lookupInput: (input: PulseLookupInput, now: Date): PulseLookupInput => {
    PulseValidation.requestDay(input.day, now);
    assertEnum('object_type', input.object_type, OBJECT_TYPES);
    assertInRange(
      'hashes length',
      input.hashes.length,
      PULSE_MIN_LOOKUP_HASHES,
      PULSE_MAX_LOOKUP_HASHES
    );
    input.hashes.forEach((hash, index) =>
      assertHash(`hashes[${index}]`, hash)
    );
    return input;
  },

  trendingInput: (
    input: PulseTrendingInput,
    now: Date
  ): ValidatedTrendingInput => {
    PulseValidation.requestDay(input.day, now);
    assertPeriod(input.period);
    if (input.sector_bucket) {
      assertEnum('sector_bucket', input.sector_bucket, SECTOR_BUCKETS);
    }
    if (input.region_bucket) {
      assertEnum('region_bucket', input.region_bucket, REGION_BUCKETS);
    }
    const first = input.first ?? PULSE_DEFAULT_TRENDING_FIRST;
    assertInRange('first', first, 1, PULSE_MAX_TRENDING_FIRST);

    let objectTypes: ReadonlySet<PulseObjectType> | null = null;
    if (input.object_types) {
      if (input.object_types.length === 0) {
        throw PulseErrors.badUserInput(
          'object_types must be null or contain at least one type'
        );
      }
      input.object_types.forEach((objectType, index) =>
        assertEnum(`object_types[${index}]`, objectType, OBJECT_TYPES)
      );
      objectTypes = new Set(input.object_types);
      if (objectTypes.size !== input.object_types.length) {
        throw PulseErrors.badUserInput('object_types must not repeat a type');
      }
    }

    return {
      day: input.day,
      period: input.period,
      sectorBucket: input.sector_bucket ?? null,
      regionBucket: input.region_bucket ?? null,
      objectTypes,
      first,
    };
  },

  benchmarkInput: (
    input: PulseBenchmarkInput,
    now: Date
  ): PulseBenchmarkInput => {
    PulseValidation.requestDay(input.day, now);
    assertPeriod(input.period);
    return input;
  },
};
