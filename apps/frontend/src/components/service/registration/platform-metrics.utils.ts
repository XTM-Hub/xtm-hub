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

// A platform with PostgreSQL stores its data there and only indexes it in Elasticsearch; one without stores it in Elasticsearch, as the backend rates its database.
export const findDatabaseUsage = (
  metrics: SaasPlatformMetrics | null | undefined,
  storage: SaasPlatformStorage | null | undefined
): {
  points: SaasPlatformMetricPoint[];
  storage: SaasPlatformStorageUsage | null | undefined;
} => {
  const postgresPoints = findMetricPoints(metrics, MetricType.PostgresUsedSize);
  if (storage?.postgres_used_size || postgresPoints.length > 0) {
    return { points: postgresPoints, storage: storage?.postgres_used_size };
  }
  return {
    points: findMetricPoints(metrics, MetricType.EsUsedSize),
    storage: storage?.es_used_size,
  };
};
