import {
  MetricType,
  SaasPlatformDailySla,
  SaasPlatformData,
  SaasPlatformMetadata,
  SaasPlatformMetricPoint,
  SaasPlatformMetrics,
  SaasPlatformMetricSeries,
  SaasPlatformMetricsPeriod,
  SaasPlatformMonthlySla,
  SaasPlatformResolution,
  SaasPlatformSla,
  SaasPlatformStorage,
  SaasPlatformStorageUsage,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { logApp } from '../../utils/app-logger.util';
import {
  toFiniteNumber,
  toIsoDate,
  toUtcDayStart,
  toUtcMonthStart,
} from '../../utils/format';
import { isRecord } from '../../utils/typescript';

const SAAS_PLATFORM_METRICS_DAYS: Record<SaasPlatformMetricsPeriod, number> = {
  [SaasPlatformMetricsPeriod.Last_7Days]: 7,
  [SaasPlatformMetricsPeriod.Last_30Days]: 30,
  [SaasPlatformMetricsPeriod.Last_90Days]: 90,
};

const SAAS_PLATFORM_SLA_MONTHS: Record<SaasPlatformMetricsPeriod, number> = {
  [SaasPlatformMetricsPeriod.Last_7Days]: 1,
  [SaasPlatformMetricsPeriod.Last_30Days]: 1,
  [SaasPlatformMetricsPeriod.Last_90Days]: 3,
};

// The availability the contract commits to, as a ratio (1 is 100 %).
const SAAS_PLATFORM_SLA_TARGET = 0.9998;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

interface SaasPlatformSlaGrid {
  // Midnight UTC on the first day of the oldest month, as a timestamp.
  firstMonth: number;
  now: Date;
}

interface AvailabilityTotal {
  sum: number;
  count: number;
}

const addToTotal = (
  totals: Map<number, AvailabilityTotal>,
  key: number,
  value: number
) => {
  const total = totals.get(key) ?? { sum: 0, count: 0 };
  totals.set(key, { sum: total.sum + value, count: total.count + 1 });
};

const toMeanAvailability = (total: AvailabilityTotal | undefined) =>
  total ? total.sum / total.count : null;

// The contract measures the availability per calendar month: the grid runs from firstMonth to the current month,
// counted to date, whatever part of it the metrics cover.
const parseSaasPlatformSla = (
  metrics: SaasPlatformMetrics | null,
  { firstMonth, now }: SaasPlatformSlaGrid
): SaasPlatformSla | null => {
  if (!metrics) {
    return null;
  }
  const points = metrics.series.find(
    ({ metric_type }) => metric_type === MetricType.SlaAvailability
  )?.points;
  if (!points) {
    return null;
  }

  const gridEnd = toUtcMonthStart(now, 1);
  const monthTotals = new Map<number, AvailabilityTotal>();
  const dayTotals = new Map<number, AvailabilityTotal>();
  for (const { timestamp, value } of points) {
    const date = new Date(timestamp);
    const time = date.getTime();
    if (typeof value !== 'number' || time < firstMonth || time >= gridEnd) {
      continue;
    }
    addToTotal(monthTotals, toUtcMonthStart(date), value);
    addToTotal(dayTotals, toUtcDayStart(date), value);
  }

  const months: SaasPlatformMonthlySla[] = [];
  for (let month = firstMonth; month < gridEnd;) {
    const nextMonth = toUtcMonthStart(new Date(month), 1);
    const days: SaasPlatformDailySla[] = [];
    // UTC has no daylight saving time: every day lasts exactly MS_PER_DAY.
    for (let day = month; day < nextMonth; day += MS_PER_DAY) {
      days.push({
        day: new Date(day).toISOString(),
        availability: toMeanAvailability(dayTotals.get(day)),
      });
    }
    months.push({
      month: new Date(month).toISOString(),
      availability: toMeanAvailability(monthTotals.get(month)),
      days,
    });
    month = nextMonth;
  }
  return { target: SAAS_PLATFORM_SLA_TARGET, months };
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

const parseSaasPlatformData = (
  body: unknown,
  slaGrid: SaasPlatformSlaGrid
): SaasPlatformData => {
  const fields: Record<string, unknown> =
    typeof body === 'object' && body !== null ? { ...body } : {};
  const metrics = parseSaasPlatformMetrics(fields.metrics);

  return {
    metadata: {
      hostname: readMetadataString(fields, 'hostname'),
      plan: readMetadataString(fields, 'plan'),
      start_date: readMetadataDate(fields, 'start_date'),
      end_date: readMetadataDate(fields, 'end_date'),
      region: readMetadataString(fields, 'region'),
    },
    metrics,
    storage: parseSaasPlatformStorage(fields.storage),
    sla: parseSaasPlatformSla(metrics, slaGrid),
  };
};

export const ProductInformationHelper = {
  fetchSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId,
    platformId: string,
    metricsPeriod: SaasPlatformMetricsPeriod
  ): Promise<SaasPlatformData | null> => {
    const days = SAAS_PLATFORM_METRICS_DAYS[metricsPeriod];
    const slaMonths = SAAS_PLATFORM_SLA_MONTHS[metricsPeriod];
    const now = new Date();
    const firstSlaMonth = toUtcMonthStart(now, 1 - slaMonths);
    // The SaaS Manager only takes a number of days back from now: ask for enough of them to cover the first SLA month
    // from its midnight, and never fewer than the period.
    const includeMetrics = Math.max(
      days,
      Math.ceil((now.getTime() - firstSlaMonth) / MS_PER_DAY)
    );
    try {
      const response = await SaasManagerClient.callInstanceApi({
        platform_id: platformId,
        include_metrics: includeMetrics,
      });

      if (response.status !== 200) {
        logApp.error('Unable to load the platform data from the SaaS Manager', {
          serviceInstanceId,
          platformId,
          status: response.status,
        });
        return null;
      }
      return parseSaasPlatformData(await response.json(), {
        firstMonth: firstSlaMonth,
        now,
      });
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
