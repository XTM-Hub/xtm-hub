import {
  MetricType,
  SaasPlatformData,
  SaasPlatformMetadata,
  SaasPlatformMetricPoint,
  SaasPlatformMetrics,
  SaasPlatformMetricSeries,
  SaasPlatformMetricsPeriod,
  SaasPlatformResolution,
  SaasPlatformStorage,
  SaasPlatformStorageUsage,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { logApp } from '../../utils/app-logger.util';
import { toFiniteNumber, toIsoDate } from '../../utils/format';
import { isRecord } from '../../utils/typescript';

const SAAS_PLATFORM_METRICS_DAYS: Record<SaasPlatformMetricsPeriod, number> = {
  [SaasPlatformMetricsPeriod.Last_7Days]: 7,
  [SaasPlatformMetricsPeriod.Last_30Days]: 30,
  [SaasPlatformMetricsPeriod.Last_90Days]: 90,
};

const METRIC_TYPES: ReadonlySet<string> = new Set(Object.values(MetricType));

const isMetricType = (value: unknown): value is MetricType =>
  typeof value === 'string' && METRIC_TYPES.has(value);

const RESOLUTIONS: ReadonlySet<string> = new Set(
  Object.values(SaasPlatformResolution)
);

const isResolution = (value: unknown): value is SaasPlatformResolution =>
  typeof value === 'string' && RESOLUTIONS.has(value);

const readMetadataString = (
  body: Record<string, unknown>,
  key: keyof SaasPlatformMetadata
): string | null => {
  const value = body[key];
  return typeof value === 'string' && value !== '' ? value : null;
};

const readMetadataDate = (
  body: Record<string, unknown>,
  key: 'start_date' | 'end_date'
): string | null => {
  const value = readMetadataString(body, key);
  if (value === null) {
    return null;
  }
  const date = toIsoDate(value);
  if (date === null) {
    logApp.warn('The SaaS Manager returned an unparseable platform date', {
      field: key,
    });
  }
  return date;
};

const parseMetricPoint = (point: unknown): SaasPlatformMetricPoint[] => {
  if (!isRecord(point)) {
    return [];
  }
  // The SaaS Manager sends t and v: the Hub exposes them as timestamp and value.
  const timestamp = toIsoDate(point.t);
  if (timestamp === null) {
    return [];
  }
  return [{ timestamp, value: toFiniteNumber(point.v) }];
};

const parseMetricSeries = (series: unknown): SaasPlatformMetricSeries[] => {
  // GraphQL rejects a value outside the enum, so a metric type the Hub does not know yet is left out.
  if (!isRecord(series) || !isMetricType(series.metric_type)) {
    return [];
  }
  return [
    {
      metric_type: series.metric_type,
      points: Array.isArray(series.points)
        ? series.points.flatMap(parseMetricPoint)
        : [],
    },
  ];
};

const parseSaasPlatformMetrics = (
  metrics: unknown
): SaasPlatformMetrics | null => {
  if (!isRecord(metrics)) {
    return null;
  }
  const start = toIsoDate(metrics.start);
  const end = toIsoDate(metrics.end);
  const resolution = metrics.resolution;
  // GraphQL rejects a value outside the enum: without a known resolution, the points cannot be read.
  if (start === null || end === null || !isResolution(resolution)) {
    logApp.warn('The SaaS Manager returned incomplete platform metrics');
    return null;
  }
  return {
    start,
    end,
    resolution,
    series: Array.isArray(metrics.series)
      ? metrics.series.flatMap(parseMetricSeries)
      : [],
  };
};

const parseStorageUsage = (usage: unknown): SaasPlatformStorageUsage | null => {
  if (!isRecord(usage)) {
    return null;
  }
  return {
    percent: toFiniteNumber(usage.percent),
    used: toFiniteNumber(usage.used),
    limit: toFiniteNumber(usage.limit),
  };
};

const parseSaasPlatformStorage = (
  storage: unknown
): SaasPlatformStorage | null => {
  if (!isRecord(storage)) {
    return null;
  }
  return {
    es_used_size: parseStorageUsage(storage.es_used_size),
    s3_used_size: parseStorageUsage(storage.s3_used_size),
  };
};

const parseSaasPlatformData = (body: unknown): SaasPlatformData => {
  const fields: Record<string, unknown> =
    typeof body === 'object' && body !== null ? { ...body } : {};

  return {
    metadata: {
      hostname: readMetadataString(fields, 'hostname'),
      plan: readMetadataString(fields, 'plan'),
      start_date: readMetadataDate(fields, 'start_date'),
      end_date: readMetadataDate(fields, 'end_date'),
      region: readMetadataString(fields, 'region'),
    },
    metrics: parseSaasPlatformMetrics(fields.metrics),
    storage: parseSaasPlatformStorage(fields.storage),
  };
};

export const ProductInformationHelper = {
  fetchSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId,
    platformId: string,
    metricsPeriod: SaasPlatformMetricsPeriod
  ): Promise<SaasPlatformData | null> => {
    try {
      const response = await SaasManagerClient.callInstanceApi({
        platform_id: platformId,
        include_metrics: SAAS_PLATFORM_METRICS_DAYS[metricsPeriod],
      });

      if (response.status !== 200) {
        logApp.error('Unable to load the platform data from the SaaS Manager', {
          serviceInstanceId,
          platformId,
          status: response.status,
        });
        return null;
      }
      return parseSaasPlatformData(await response.json());
    } catch (error) {
      logApp.error('Unable to load the platform data from the SaaS Manager', {
        serviceInstanceId,
        platformId,
        error,
      });
      return null;
    }
  },
};
