import { ApolloServer } from '@apollo/server';
import express from 'express';
import { randomUUID } from 'node:crypto';
import type { GraphQLFormattedError } from 'graphql';
import { vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { contextSimpleUserFiligran2 } from '../../../../tests/tests.const';
import {
  PulseBenchmarkResult,
  PulseDigest,
  PulseEventKind,
  PulseLookupResult,
  PulseObjectType,
  PulsePeriod,
  PulsePurgeResult,
  PulseRegionBucket,
  PulseSalt,
  PulseSectorBucket,
  PulseStatus,
  PulseTrendingResult,
  PushPulseResult,
} from '../../../__generated__/resolvers-types';
import createSchema from '../../../server/graphql-schema';
import { PulseClock, PulseDay } from '../pulse.day.helper';

type TestPortalContext = typeof contextSimpleUserFiligran2;

export type TestPulsePlatform = Awaited<
  ReturnType<typeof TestHelper.pulse.registerPlatform>
>;

export interface PulseTestRecord {
  objectType: PulseObjectType;
  value: string;
  eventKind?: PulseEventKind;
  count?: number;
}

export interface PulseOperationResult<T> {
  data: T | null | undefined;
  errors: readonly GraphQLFormattedError[] | undefined;
}

// Scenarios simulate several platforms, each request going through the
// directive, the rate limiter and a transaction.
export const PULSE_INTEGRATION_SUITE = { timeout: 60_000 };

export const PULSE_TEST_NOW = '2026-10-03T10:00:00.000Z';
export const PULSE_TEST_TODAY = '2026-10-03';
export const PULSE_TEST_YESTERDAY = '2026-10-02';

export const PULSE_SALT_QUERY = `
  query PulseSalt($day: String!) {
    pulseSalt(day: $day) { day salt }
  }
`;

export const PULSE_STATUS_QUERY = `
  query PulseStatus {
    pulseStatus {
      day k_threshold retention_months contributors_bucket read_access last_contribution_day
      contribution_status read_access_until contribution_window_days contribution_grace_days
    }
  }
`;

export const PUSH_PULSE_MUTATION = `
  mutation PushPulse($input: PushPulseInput!) {
    pushPulse(input: $input) { accepted day }
  }
`;

export const PULSE_LOOKUP_QUERY = `
  query PulseLookup($input: PulseLookupInput!) {
    pulseLookup(input: $input) {
      hash published prevalence_bucket platforms_bucket first_seen_network last_seen_network
      trend trend_series sector_trend sector_platforms_bucket
    }
  }
`;

export const PULSE_TRENDING_QUERY = `
  query PulseTrending($input: PulseTrendingInput!) {
    pulseTrending(input: $input) {
      day period sector_bucket region_bucket
      items { hash object_type platforms_bucket prevalence_bucket trend growth first_seen_network }
    }
  }
`;

export const PULSE_BENCHMARK_QUERY = `
  query PulseBenchmark($input: PulseBenchmarkInput!) {
    pulseBenchmark(input: $input) {
      period sector_bucket region_bucket sector_platforms_bucket
      metrics { object_type event_kind platform_count sector_median network_median }
      top_items { hash object_type platform_count sector_median ratio }
    }
  }
`;

export const PULSE_DIGEST_QUERY = `
  query PulseDigest($input: PulseDigestInput!) {
    pulseDigest(input: $input) {
      day sector_bucket region_bucket
      items { hash object_type prevalence_bucket trend }
      trending { period locked_count items { rank hash object_type prevalence_bucket trend } }
    }
  }
`;

export const PULSE_PURGE_MUTATION = `
  mutation PulsePurge($platformId: String!) {
    pulsePurge(platformId: $platformId) { success deleted_records }
  }
`;

let server: ApolloServer<TestPortalContext> | undefined;

const getServer = (): ApolloServer<TestPortalContext> => {
  server ??= new ApolloServer<TestPortalContext>({ schema: createSchema() });
  return server;
};

// Runs an operation through the real schema, so the @platform_token
// directive, GraphQL input coercion and the resolvers are all exercised.
export const executePulse = async <T>({
  query,
  variables = {},
  platform,
}: {
  query: string;
  variables?: Record<string, unknown>;
  platform?: TestPulsePlatform;
}): Promise<PulseOperationResult<T>> => {
  const headers: Record<string, string> = platform
    ? {
        'xtm-hub-platform-id': platform.platformId,
        'xtm-hub-platform-token': platform.token,
      }
    : {};
  const response = await getServer().executeOperation<T>(
    { query, variables },
    {
      contextValue: {
        ...contextSimpleUserFiligran2,
        req: { headers, body: { variables } } as unknown as express.Request,
        res: {} as express.Response,
      },
    }
  );
  if (response.body.kind !== 'single') {
    throw new Error('Unexpected incremental GraphQL response');
  }
  return {
    data: response.body.singleResult.data,
    errors: response.body.singleResult.errors,
  };
};

export const errorCodes = (result: PulseOperationResult<unknown>): unknown[] =>
  (result.errors ?? []).map((error) => error.extensions?.code);

// Moves the service clock; every Pulse day computation reads PulseClock.
export const usePulseClock = (initialIso: string = PULSE_TEST_NOW) => {
  let current = new Date(initialIso);
  vi.spyOn(PulseClock, 'now').mockImplementation(() => new Date(current));
  return {
    today: () => PulseDay.today(current),
    setTime: (iso: string) => {
      current = new Date(iso);
    },
    addDays: (days: number) => {
      current = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
    },
    addMinutes: (minutes: number) => {
      current = new Date(current.getTime() + minutes * 60 * 1000);
    },
    now: () => new Date(current),
  };
};

const requireData = <T>(result: PulseOperationResult<T>): T => {
  if (result.errors?.length || !result.data) {
    throw new Error(
      `Threat Pulse operation failed: ${JSON.stringify(result.errors)}`
    );
  }
  return result.data;
};

export interface PulsePushOptions {
  day: string;
  records: readonly PulseTestRecord[];
  sector?: PulseSectorBucket;
  region?: PulseRegionBucket;
  // A new batch unless given: a retry sends the id of the batch again.
  batchId?: string;
}

export interface PulseLookupOptions {
  day: string;
  objectType: PulseObjectType;
  values: readonly string[];
}

export interface PulseTrendingOptions {
  day: string;
  period: PulsePeriod;
  sector_bucket?: PulseSectorBucket | null;
  region_bucket?: PulseRegionBucket | null;
  object_types?: PulseObjectType[] | null;
  first?: number | null;
}

export interface PulseBenchmarkOptions {
  day: string;
  period: PulsePeriod;
  platformId?: string;
}

// Simulated OpenCTI platform: derives stable keys from raw values locally and
// only ever sends transport hashes, exactly as the contract requires.
export const pulseClient = (platform: TestPulsePlatform) => {
  const salt = async (day: string): Promise<string> =>
    requireData(
      await executePulse<{ pulseSalt: PulseSalt }>({
        query: PULSE_SALT_QUERY,
        variables: { day },
        platform,
      })
    ).pulseSalt.salt;

  const hash = async (
    day: string,
    objectType: PulseObjectType,
    value: string
  ): Promise<string> =>
    TestHelper.pulse.hashValue(objectType, value, await salt(day));

  const pushResult = async ({
    day,
    records,
    sector = PulseSectorBucket.Finance,
    region = PulseRegionBucket.Europe,
    batchId = randomUUID(),
  }: PulsePushOptions): Promise<
    PulseOperationResult<{ pushPulse: PushPulseResult }>
  > => {
    const daySalt = await salt(day);
    return executePulse<{ pushPulse: PushPulseResult }>({
      query: PUSH_PULSE_MUTATION,
      variables: {
        input: {
          batch_id: batchId,
          day,
          sector_bucket: sector,
          region_bucket: region,
          records: records.map((record) => ({
            hash: TestHelper.pulse.hashValue(
              record.objectType,
              record.value,
              daySalt
            ),
            object_type: record.objectType,
            event_kind: record.eventKind ?? PulseEventKind.Created,
            count: record.count ?? 1,
          })),
        },
      },
      platform,
    });
  };

  const lookupResult = async ({
    day,
    objectType,
    values,
  }: PulseLookupOptions): Promise<
    PulseOperationResult<{ pulseLookup: PulseLookupResult[] }>
  > => {
    const daySalt = await salt(day);
    return executePulse<{ pulseLookup: PulseLookupResult[] }>({
      query: PULSE_LOOKUP_QUERY,
      variables: {
        input: {
          day,
          object_type: objectType,
          hashes: values.map((value) =>
            TestHelper.pulse.hashValue(objectType, value, daySalt)
          ),
        },
      },
      platform,
    });
  };

  const trendingResult = (
    input: PulseTrendingOptions
  ): Promise<PulseOperationResult<{ pulseTrending: PulseTrendingResult }>> =>
    executePulse<{ pulseTrending: PulseTrendingResult }>({
      query: PULSE_TRENDING_QUERY,
      variables: { input },
      platform,
    });

  const benchmarkResult = ({
    day,
    period,
    platformId = platform.platformId,
  }: PulseBenchmarkOptions): Promise<
    PulseOperationResult<{ pulseBenchmark: PulseBenchmarkResult }>
  > =>
    executePulse<{ pulseBenchmark: PulseBenchmarkResult }>({
      query: PULSE_BENCHMARK_QUERY,
      variables: { input: { platformId, day, period } },
      platform,
    });

  const statusResult = (): Promise<
    PulseOperationResult<{ pulseStatus: PulseStatus }>
  > =>
    executePulse<{ pulseStatus: PulseStatus }>({
      query: PULSE_STATUS_QUERY,
      platform,
    });

  const digestResult = ({
    day,
    sector = PulseSectorBucket.Finance,
    region = null,
  }: {
    day: string;
    sector?: PulseSectorBucket | null;
    region?: PulseRegionBucket | null;
  }): Promise<PulseOperationResult<{ pulseDigest: PulseDigest }>> =>
    executePulse<{ pulseDigest: PulseDigest }>({
      query: PULSE_DIGEST_QUERY,
      variables: {
        input: { day, sector_bucket: sector, region_bucket: region },
      },
      platform,
    });

  const purgeResult = (
    platformId: string = platform.platformId
  ): Promise<PulseOperationResult<{ pulsePurge: PulsePurgeResult }>> =>
    executePulse<{ pulsePurge: PulsePurgeResult }>({
      query: PULSE_PURGE_MUTATION,
      variables: { platformId },
      platform,
    });

  return {
    platform,
    salt,
    hash,
    pushResult,
    push: async (options: PulsePushOptions): Promise<PushPulseResult> =>
      requireData(await pushResult(options)).pushPulse,
    lookupResult,
    lookup: async (options: PulseLookupOptions): Promise<PulseLookupResult[]> =>
      requireData(await lookupResult(options)).pulseLookup,
    trendingResult,
    trending: async (
      options: PulseTrendingOptions
    ): Promise<PulseTrendingResult> =>
      requireData(await trendingResult(options)).pulseTrending,
    benchmarkResult,
    benchmark: async (
      options: PulseBenchmarkOptions
    ): Promise<PulseBenchmarkResult> =>
      requireData(await benchmarkResult(options)).pulseBenchmark,
    statusResult,
    status: async (): Promise<PulseStatus> =>
      requireData(await statusResult()).pulseStatus,
    digestResult,
    digest: async (
      options: Parameters<typeof digestResult>[0]
    ): Promise<PulseDigest> =>
      requireData(await digestResult(options)).pulseDigest,
    purgeResult,
    purge: async (): Promise<PulsePurgeResult> =>
      requireData(await purgeResult()).pulsePurge,
  };
};

export type PulseTestClient = ReturnType<typeof pulseClient>;

export const registerPulseClients = async (
  count: number
): Promise<PulseTestClient[]> => {
  const clients: PulseTestClient[] = [];
  for (let index = 0; index < count; index++) {
    clients.push(pulseClient(await TestHelper.pulse.registerPlatform()));
  }
  return clients;
};

export const pushFromEach = async (
  clients: readonly PulseTestClient[],
  options: PulsePushOptions
): Promise<void> => {
  for (const client of clients) {
    await client.push(options);
  }
};

export const cleanPulseState = async (): Promise<void> => {
  await TestHelper.pulse.cleanTables();
  await TestHelper.pulse.cleanPlatforms();
};
