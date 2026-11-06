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

// A platform without Elasticsearch stores its data in PostgreSQL only, as the backend rates its database.
export const findDatabaseUsage = (
  metrics: SaasPlatformMetrics | null | undefined,
  storage: SaasPlatformStorage | null | undefined
): {
  points: SaasPlatformMetricPoint[];
  storage: SaasPlatformStorageUsage | null | undefined;
} => {
  const esPoints = findMetricPoints(metrics, MetricType.EsUsedSize);
  if (storage?.es_used_size || esPoints.length > 0) {
    return { points: esPoints, storage: storage?.es_used_size };
  }
  return {
    points: findMetricPoints(metrics, MetricType.PostgresUsedSize),
    storage: storage?.postgres_used_size,
  };
};
