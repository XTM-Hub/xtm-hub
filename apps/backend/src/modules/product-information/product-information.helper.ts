import {
  MetricType,
  SaasPlatform,
  SaasPlatformContractStatus,
  SaasPlatformDailySla,
  SaasPlatformData,
  SaasPlatformHealthIssue,
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
  SaasProduct,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import {
  SaasManagerClient,
  type SaasManagerInstanceListRequest,
} from '../../thirdparty/saasmanager/client';
import { logApp } from '../../utils/app-logger.util';
import {
  percentToRatio,
  toFiniteNumber,
  toIsoDate,
  toUtcDayStart,
  toUtcMonthStart,
} from '../../utils/format';
import { isRecord } from '../../utils/typescript';

const SAAS_PLATFORM_METRICS_PERIODS: Record<
  SaasPlatformMetricsPeriod,
  { days: number; slaMonths: number }
> = {
  [SaasPlatformMetricsPeriod.Last_30Days]: { days: 30, slaMonths: 1 },
  [SaasPlatformMetricsPeriod.Last_90Days]: { days: 90, slaMonths: 3 },
  [SaasPlatformMetricsPeriod.Last_180Days]: { days: 180, slaMonths: 6 },
};

// The availability the contract commits to, as a ratio (1 is 100 %).
const SAAS_PLATFORM_SLA_TARGET = 0.9998;

// Rated on the availability as displayed, a percent with two decimals: 99.975 % shows as 99.98 % and meets the target.
const SAAS_PLATFORM_SLA_RATIO_SCALE = 10_000;

// Above this share of its capacity, in percent, a storage needs room soon.
const SAAS_PLATFORM_STORAGE_USAGE_HIGH_PERCENT = 80;

// Under this many days left, the renewal of the contract is due.
const SAAS_PLATFORM_CONTRACT_ENDING_SOON_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface SaasPlatformsPage {
  totalCount: number;
  platforms: SaasPlatform[];
}

const METRIC_TYPES: ReadonlySet<string> = new Set(Object.values(MetricType));

const isMetricType = (value: unknown): value is MetricType =>
  typeof value === 'string' && METRIC_TYPES.has(value);

const RESOLUTIONS: ReadonlySet<string> = new Set(
  Object.values(SaasPlatformResolution)
);

const isResolution = (value: unknown): value is SaasPlatformResolution =>
  typeof value === 'string' && RESOLUTIONS.has(value);

const SAAS_PRODUCTS: ReadonlySet<string> = new Set(Object.values(SaasProduct));

const isSaasProduct = (value: unknown): value is SaasProduct =>
  typeof value === 'string' && SAAS_PRODUCTS.has(value);

const readString = (
  body: Record<string, unknown>,
  key: string
): string | null => {
  const value = body[key];
  return typeof value === 'string' && value !== '' ? value : null;
};

const readMetadataDate = (
  body: Record<string, unknown>,
  key: 'start_date' | 'end_date'
): string | null => {
  const value = readString(body, key);
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

const parseSaasPlatformMetadata = (
  fields: Record<string, unknown>
): SaasPlatformMetadata => ({
  hostname: readString(fields, 'hostname'),
  plan: readString(fields, 'plan'),
  start_date: readMetadataDate(fields, 'start_date'),
  end_date: readMetadataDate(fields, 'end_date'),
  region: readString(fields, 'region'),
});

const parseSaasPlatformData = (
  body: unknown,
  slaGrid: SaasPlatformSlaGrid
): SaasPlatformData => {
  const fields: Record<string, unknown> =
    typeof body === 'object' && body !== null ? { ...body } : {};
  const metrics = parseSaasPlatformMetrics(fields.metrics);

  return {
    metadata: parseSaasPlatformMetadata(fields),
    metrics,
    storage: parseSaasPlatformStorage(fields.storage),
    sla: parseSaasPlatformSla(metrics, slaGrid),
  };
};

const isSlaMissed = (availability: number): boolean =>
  Math.round(availability * SAAS_PLATFORM_SLA_RATIO_SCALE) <
  Math.round(SAAS_PLATFORM_SLA_TARGET * SAAS_PLATFORM_SLA_RATIO_SCALE);

const isStorageUsageHigh = (percent: number): boolean =>
  percent > SAAS_PLATFORM_STORAGE_USAGE_HIGH_PERCENT;

// The issues the most severe first: a missed SLA already breaks the contract, a full storage only will.
const parseSaasPlatformHealthIssues = (
  availability: number | null,
  storage: SaasPlatformStorage | null
): SaasPlatformHealthIssue[] | null => {
  const measures: {
    issue: SaasPlatformHealthIssue;
    value: number | null | undefined;
    hasIssue: (value: number) => boolean;
  }[] = [
    {
      issue: SaasPlatformHealthIssue.Availability,
      value: availability,
      hasIssue: isSlaMissed,
    },
    {
      issue: SaasPlatformHealthIssue.Database,
      value: storage?.es_used_size?.percent,
      hasIssue: isStorageUsageHigh,
    },
    {
      issue: SaasPlatformHealthIssue.FileStorage,
      value: storage?.s3_used_size?.percent,
      hasIssue: isStorageUsageHigh,
    },
  ];
  // Without any measure, the platform cannot be told healthy.
  if (measures.every(({ value }) => typeof value !== 'number')) {
    return null;
  }
  return measures.flatMap(({ issue, value, hasIssue }) =>
    typeof value === 'number' && hasIssue(value) ? [issue] : []
  );
};

// Counted in started days, as the board shows them: a contract that ends in 89.5 days has 90 days left.
const parseSaasPlatformContractStatus = (
  endDate: string | null,
  now: Date
): SaasPlatformContractStatus | null => {
  if (endDate === null) {
    return null;
  }
  const daysLeft = Math.ceil(
    (Date.parse(endDate) - now.getTime()) / MS_PER_DAY
  );
  if (daysLeft <= 0) {
    return SaasPlatformContractStatus.Ended;
  }
  return daysLeft < SAAS_PLATFORM_CONTRACT_ENDING_SOON_DAYS
    ? SaasPlatformContractStatus.EndingSoon
    : SaasPlatformContractStatus.Active;
};

// The SaaS Manager does not guarantee the case of its product codes: GraphQL rejects a value outside the enum.
const readSaasProduct = (
  platform: Record<string, unknown>
): SaasProduct | null => {
  const product = readString(platform, 'product');
  if (product === null) {
    return null;
  }
  const code = product.toUpperCase();
  if (isSaasProduct(code)) {
    return code;
  }
  logApp.warn('The SaaS Manager returned an unknown product', { product });
  return null;
};

// Null for a platform that cannot be read, left out of its page.
const parseSaasPlatform = (
  platform: unknown,
  now: Date
): SaasPlatform | null => {
  if (!isRecord(platform)) {
    return null;
  }
  // Without an id, the platform cannot be told apart from the others.
  const id = readString(platform, 'id');
  if (id === null) {
    return null;
  }
  // The SaaS Manager lists the availability as a percentage, the Hub serves it as a ratio, as for the SLA of a platform.
  const slaPercent = toFiniteNumber(platform.sla_cmtd);
  const availability = slaPercent === null ? null : percentToRatio(slaPercent);
  const storage = parseSaasPlatformStorage(platform.storage);
  for (const usage of [storage?.es_used_size, storage?.s3_used_size]) {
    if (usage && (usage.limit ?? 0) <= 0) {
      usage.percent = null;
    }
  }
  const metadata = parseSaasPlatformMetadata(platform);
  return {
    id,
    status: readString(platform, 'status'),
    product: readSaasProduct(platform),
    customer: readString(platform, 'customer'),
    commercial_model: readString(platform, 'commercial_model'),
    sla_cmtd: availability,
    metadata,
    storage,
    health_issues: parseSaasPlatformHealthIssues(availability, storage),
    contract_status: parseSaasPlatformContractStatus(metadata.end_date, now),
  };
};

export const ProductInformationHelper = {
  fetchSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId,
    platformId: string,
    metricsPeriod: SaasPlatformMetricsPeriod
  ): Promise<SaasPlatformData | null> => {
    const { days, slaMonths } = SAAS_PLATFORM_METRICS_PERIODS[metricsPeriod];
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

  fetchSaasPlatforms: async (
    request: SaasManagerInstanceListRequest
  ): Promise<SaasPlatformsPage | null> => {
    try {
      const response = await SaasManagerClient.callInstanceListApi(request);

      if (response.status !== 200) {
        logApp.error('Unable to load the platforms from the SaaS Manager', {
          page: request.page,
          status: response.status,
        });
        return null;
      }
      const body: unknown = await response.json();
      // Without its list of results, the page cannot be told empty: it is as unreadable as a failed call.
      if (!isRecord(body) || !Array.isArray(body.results)) {
        logApp.error(
          'The SaaS Manager returned an unreadable page of platforms',
          {
            page: request.page,
          }
        );
        return null;
      }
      const now = new Date();
      const platforms = body.results.flatMap((platform) => {
        const parsed = parseSaasPlatform(platform, now);
        return parsed ? [parsed] : [];
      });
      const totalCount = toFiniteNumber(body.count);
      if (
        totalCount === null ||
        !Number.isInteger(totalCount) ||
        totalCount < 0
      ) {
        logApp.error('The SaaS Manager returned an unreadable platform count', {
          page: request.page,
        });
        return null;
      }
      return {
        totalCount,
        platforms,
      };
    } catch (error) {
      logApp.error('Unable to load the platforms from the SaaS Manager', {
        page: request.page,
        error,
      });
      return null;
    }
  },
};
