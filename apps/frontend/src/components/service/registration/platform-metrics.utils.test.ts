import {
  findDatabaseUsage,
  findMetricPoints,
} from '@/components/service/registration/platform-metrics.utils';
import {
  MetricType,
  SaasPlatformMetrics,
  SaasPlatformResolution,
  SaasPlatformStorage,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const s3Points = [
  { timestamp: '2026-09-22T09:00:00.000Z', value: 1_000 },
  { timestamp: '2026-09-22T10:00:00.000Z', value: 2_000 },
];

const metrics: SaasPlatformMetrics = {
  start: '2026-09-22T09:00:00.000Z',
  end: '2026-10-22T09:00:00.000Z',
  resolution: SaasPlatformResolution.Hour,
  series: [
    {
      metric_type: MetricType.SlaAvailability,
      points: [{ timestamp: '2026-09-22T09:00:00.000Z', value: 1 }],
    },
    { metric_type: MetricType.S3UsedSize, points: s3Points },
  ],
};

describe('findMetricPoints', () => {
  it('should return the points of the series of the given metric type', () => {
    expect(findMetricPoints(metrics, MetricType.S3UsedSize)).toBe(s3Points);
  });

  it('should return no points when no series has the given metric type', () => {
    expect(findMetricPoints(metrics, MetricType.EsUsedSize)).toEqual([]);
  });

  it.each([[null], [undefined]])(
    'should return no points when the metrics are %s',
    (missingMetrics) => {
      expect(findMetricPoints(missingMetrics, MetricType.S3UsedSize)).toEqual(
        []
      );
    }
  );
});

describe('findDatabaseUsage', () => {
  const esPoints = [{ timestamp: '2026-09-22T09:00:00.000Z', value: 3_000 }];
  const postgresPoints = [
    { timestamp: '2026-09-22T09:00:00.000Z', value: 4_000 },
  ];
  const esUsage = { percent: 30, used: 3_000, limit: 10_000 };
  const postgresUsage = { percent: 40, used: 4_000, limit: 10_000 };
  const databaseMetrics = (...series: SaasPlatformMetrics['series']) => ({
    ...metrics,
    series,
  });
  const postgresSeries = {
    metric_type: MetricType.PostgresUsedSize,
    points: postgresPoints,
  };
  const esSeries = { metric_type: MetricType.EsUsedSize, points: esPoints };

  it.each`
    case                                         | databaseMetrics                              | storage                                                         | expected
    ${'PostgreSQL when its usage is sent'}       | ${databaseMetrics(esSeries, postgresSeries)} | ${{ es_used_size: esUsage, postgres_used_size: postgresUsage }} | ${{ points: postgresPoints, storage: postgresUsage }}
    ${'PostgreSQL when only its series is sent'} | ${databaseMetrics(esSeries, postgresSeries)} | ${null}                                                         | ${{ points: postgresPoints, storage: undefined }}
    ${'Elasticsearch without PostgreSQL'}        | ${databaseMetrics(esSeries)}                 | ${{ es_used_size: esUsage, postgres_used_size: null }}          | ${{ points: esPoints, storage: esUsage }}
    ${'no usage without any database measure'}   | ${null}                                      | ${null}                                                         | ${{ points: [], storage: undefined }}
  `(
    'should return the usage of $case',
    ({
      databaseMetrics: sentMetrics,
      storage,
      expected,
    }: {
      databaseMetrics: SaasPlatformMetrics | null;
      storage: SaasPlatformStorage | null;
      expected: ReturnType<typeof findDatabaseUsage>;
    }) => {
      // Given the measures the SaaS Manager sent for a platform
      // When the usage of its database is looked up
      const usage = findDatabaseUsage(sentMetrics, storage);

      // Then it comes from the database the platform runs on
      expect(usage).toEqual(expected);
    }
  );
});
