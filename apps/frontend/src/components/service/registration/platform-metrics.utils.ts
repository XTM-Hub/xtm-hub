import {
  MetricType,
  SaasPlatformMetricPoint,
  SaasPlatformMetrics,
  SaasPlatformStorage,
  SaasPlatformStorageUsage,
} from '@graphql/generated';

export const findMetricPoints = (
  metrics: SaasPlatformMetrics | null | undefined,
  metricType: MetricType
): SaasPlatformMetricPoint[] =>
  metrics?.series.find((series) => series.metric_type === metricType)?.points ??
  [];

export const DATABASE_ENGINE_NAME = {
  postgres: 'PostgreSQL',
  elasticsearch: 'Elasticsearch',
} as const;

export type DatabaseEngine = keyof typeof DATABASE_ENGINE_NAME;

// A platform with PostgreSQL stores its data there and only indexes it in Elasticsearch; one without stores it in Elasticsearch, as the backend rates its database.
export const findDatabaseUsage = (
  metrics: SaasPlatformMetrics | null | undefined,
  storage: SaasPlatformStorage | null | undefined
): {
  engine: DatabaseEngine;
  points: SaasPlatformMetricPoint[];
  storage: SaasPlatformStorageUsage | null | undefined;
} => {
  const postgresPoints = findMetricPoints(metrics, MetricType.PostgresUsedSize);
  if (storage?.postgres_used_size || postgresPoints.length > 0) {
    return {
      engine: 'postgres',
      points: postgresPoints,
      storage: storage?.postgres_used_size,
    };
  }
  return {
    engine: 'elasticsearch',
    points: findMetricPoints(metrics, MetricType.EsUsedSize),
    storage: storage?.es_used_size,
  };
};
