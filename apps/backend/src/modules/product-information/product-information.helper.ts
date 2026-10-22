import {
  SaasPlatformData,
  SaasPlatformMetadata,
  SaasPlatformMetricPoint,
  SaasPlatformMetrics,
  SaasPlatformMetricSeries,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { logApp } from '../../utils/app-logger.util';

const SAAS_PLATFORM_METRICS_DAYS = 30;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

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
  const t = toIsoDate(point.t);
  if (t === null) {
    return [];
  }
  return [{ t, v: typeof point.v === 'number' ? point.v : null }];
};

const parseMetricSeries = (series: unknown): SaasPlatformMetricSeries[] => {
  if (
    !isRecord(series) ||
    typeof series.metric_type !== 'string' ||
    series.metric_type === ''
  ) {
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
  if (
    start === null ||
    end === null ||
    typeof resolution !== 'string' ||
    resolution === ''
  ) {
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
  };
};

export const ProductInformationHelper = {
  fetchSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId,
    platformId: string
  ): Promise<SaasPlatformData | null> => {
    try {
      const response = await SaasManagerClient.callInstanceApi({
        platform_id: platformId,
        include_metrics: SAAS_PLATFORM_METRICS_DAYS,
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
