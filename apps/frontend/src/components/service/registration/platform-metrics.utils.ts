import {
  MetricType,
  SaasPlatformMetricPoint,
  SaasPlatformMetrics,
} from '@graphql/generated';

export const findMetricPoints = (
  metrics: SaasPlatformMetrics | null | undefined,
  metricType: MetricType
): SaasPlatformMetricPoint[] =>
  metrics?.series.find((series) => series.metric_type === metricType)?.points ??
  [];
