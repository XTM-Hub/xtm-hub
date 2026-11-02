import { findMetricPoints } from '@/components/service/registration/platform-metrics.utils';
import {
  MetricType,
  SaasPlatformMetrics,
  SaasPlatformResolution,
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
