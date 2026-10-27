import type { ChipSeverity } from '@filigran/design-system';
import {
  SaasPlatformMetricPoint,
  SaasPlatformMetricsPeriod,
  SaasPlatformMonthlySla,
} from '@graphql/generated';

// The SaaS Manager sends the availability as a ratio: 1 is 100 %.
export const SLA_AVAILABILITY_TARGET = 0.9998;

// The contract measures the availability per calendar month: a period shows whole months, the current one last.
const SLA_MONTH_COUNT: Record<SaasPlatformMetricsPeriod, number> = {
  [SaasPlatformMetricsPeriod.Last_7Days]: 1,
  [SaasPlatformMetricsPeriod.Last_30Days]: 1,
  [SaasPlatformMetricsPeriod.Last_90Days]: 3,
};

export type SlaDayStatus = 'Met' | 'Missed' | 'Unknown';

export const SLA_DAY_STATUS_CLASS: Record<SlaDayStatus, string> = {
  Met: 'bg-feedback-success-primary',
  Missed: 'bg-feedback-alert-primary',
  Unknown: 'bg-feedback-neutral-primary',
};

export const SLA_STATUS_CHIP_SEVERITY: Record<SlaDayStatus, ChipSeverity> = {
  Met: 'low',
  Missed: 'medium',
  Unknown: 'neutral',
};

export interface SlaDay {
  date: Date;
  availability: number | null;
  status: SlaDayStatus;
}

export interface SlaMonth {
  start: Date;
  end: Date;
  isCurrent: boolean;
  days: SlaDay[];
}

export const slaDayStatus = (availability: number | null): SlaDayStatus => {
  if (availability === null) {
    return 'Unknown';
  }
  return availability > SLA_AVAILABILITY_TARGET ? 'Met' : 'Missed';
};

const toUtcDayKey = (date: Date): string => date.toISOString().slice(0, 10);

// The points come per hour or per day: a day's availability is the mean of its points.
export const averageAvailabilityByDay = (
  points: SaasPlatformMetricPoint[]
): Map<string, number> => {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const { timestamp, value } of points) {
    if (typeof value !== 'number') {
      continue;
    }
    const key = toUtcDayKey(new Date(timestamp));
    const total = totals.get(key) ?? { sum: 0, count: 0 };
    totals.set(key, { sum: total.sum + value, count: total.count + 1 });
  }
  return new Map(
    [...totals].map(([key, { sum, count }]) => [key, sum / count])
  );
};

export const buildSlaMonths = (
  points: SaasPlatformMetricPoint[],
  period: SaasPlatformMetricsPeriod,
  now: Date
): SlaMonth[] => {
  const availabilityByDay = averageAvailabilityByDay(points);
  const monthCount = SLA_MONTH_COUNT[period];
  const year = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  return Array.from({ length: monthCount }, (_, index) => {
    // Date.UTC carries a negative month over to the previous year.
    const month = currentMonth - (monthCount - 1 - index);
    const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const days = Array.from({ length: dayCount }, (_, dayIndex) => {
      const date = new Date(Date.UTC(year, month, dayIndex + 1));
      const availability = availabilityByDay.get(toUtcDayKey(date)) ?? null;
      return { date, availability, status: slaDayStatus(availability) };
    });
    return {
      start: new Date(Date.UTC(year, month, 1)),
      end: new Date(Date.UTC(year, month, dayCount)),
      isCurrent: index === monthCount - 1,
      days,
    };
  });
};

export interface SlaMonthSummary {
  month: Date;
  availability: number | null;
  status: SlaDayStatus;
  isCurrent: boolean;
}

// The most recent month first, as the summary reads from the current month back.
export const toSlaMonthSummaries = (
  sla: SaasPlatformMonthlySla[],
  now: Date
): SlaMonthSummary[] => {
  const currentMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return sla
    .map(({ month, availability }) => {
      const date = new Date(month);
      return {
        month: date,
        availability,
        status: slaDayStatus(availability),
        isCurrent: date.getTime() === currentMonth,
      };
    })
    .reverse();
};

// The current month is not over yet and a month without any value says nothing: neither counts as a full month.
export const countFullMonthsOnTarget = (
  months: SlaMonthSummary[]
): { met: number; total: number } => {
  const fullMonths = months.filter(
    ({ isCurrent, availability }) => !isCurrent && availability !== null
  );
  return {
    met: fullMonths.filter(({ status }) => status === 'Met').length,
    total: fullMonths.length,
  };
};

// A day is measured when the series has at least one value for it.
export const countMeasuredDays = (
  points: SaasPlatformMetricPoint[],
  month: Date
): { measured: number; total: number } => {
  const monthKey = month.toISOString().slice(0, 7);
  const measured = [...averageAvailabilityByDay(points).keys()].filter((day) =>
    day.startsWith(monthKey)
  ).length;
  const total = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return { measured, total };
};
