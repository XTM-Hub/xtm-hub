'use client';

import {
  buildSlaMonths,
  SLA_DAY_STATUS_CLASS,
  SlaDay,
  SlaDayStatus,
  SlaMonth,
} from '@/components/service/registration/sla-usage-chart.utils';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import {
  SaasPlatformMetricPoint,
  SaasPlatformMetricsPeriod,
} from '@graphql/generated';
import { useFormatter } from 'next-intl';
import { useMemo } from 'react';

interface SlaUsageChartProps {
  points: SaasPlatformMetricPoint[];
  period: SaasPlatformMetricsPeriod;
}

// The days are UTC days, as the SaaS Manager counts them.
const DAY_FORMAT = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const;
const MONTH_FORMAT = { month: 'short', timeZone: 'UTC' } as const;
const LEGEND_STATUSES: SlaDayStatus[] = ['Met', 'Missed', 'Unknown'];

export const SlaUsageChart = ({ points, period }: SlaUsageChartProps) => {
  const t = useTranslate();
  const format = useFormatter();
  const months = useMemo(
    () => buildSlaMonths(points, period, new Date()),
    [points, period]
  );
  const isSingleMonth = months.length === 1;

  const monthLabel = (month: SlaMonth) => {
    if (isSingleMonth) {
      return t('Register.Metrics.SLA.MonthRange', {
        start: format.dateTime(month.start, DAY_FORMAT),
        end: format.dateTime(month.end, DAY_FORMAT),
      });
    }
    const monthName = format.dateTime(month.start, MONTH_FORMAT);
    return month.isCurrent
      ? t('Register.Metrics.SLA.MonthToDate', { month: monthName })
      : monthName;
  };

  const dayStatusLabel = ({ availability, status }: SlaDay) => {
    if (availability === null) {
      return t('Register.Metrics.SLA.NoData');
    }
    const values = {
      availability: format.number(availability, {
        style: 'percent',
        maximumFractionDigits: 2,
      }),
    };
    return status === 'Met'
      ? t('Register.Metrics.SLA.OnTarget', values)
      : t('Register.Metrics.SLA.BelowTarget', values);
  };

  const dayDetails = (day: SlaDay) => (
    <>
      <span className="block">{format.dateTime(day.date, DAY_FORMAT)}</span>
      <span className="block">{dayStatusLabel(day)}</span>
    </>
  );

  return (
    <figure>
      <figcaption className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="title-xs">{t('Register.Metrics.SLA.Title')}</h3>
          <p className="text-default-secondary">
            {t('Register.Metrics.SLA.Subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          {LEGEND_STATUSES.map((status) => (
            <span
              key={status}
              className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  SLA_DAY_STATUS_CLASS[status]
                )}
              />
              {t(`Register.Metrics.SLA.Legend.${status}`)}
            </span>
          ))}
        </div>
      </figcaption>
      {/* A bar is a few pixels wide: the pointer never rests on one long enough for the default delay, and a
          hoverable tooltip would stay on the previous day while the pointer crosses the next bars towards it. */}
      <TooltipProvider
        delayDuration={0}
        disableHoverableContent>
        <div className="mt-4 flex gap-2">
          {months.map((month) => {
            const label = monthLabel(month);
            return (
              <div
                key={month.start.toISOString()}
                className="flex flex-col items-center gap-2"
                // A month takes a width in proportion to its days, so every bar is as wide.
                style={{ flexGrow: month.days.length, flexBasis: 0 }}>
                <ol
                  aria-label={label}
                  className={cn(
                    'flex h-12 w-full list-none pl-0',
                    isSingleMonth ? 'gap-1' : 'gap-px'
                  )}>
                  {month.days.map((day) => (
                    <Tooltip key={day.date.toISOString()}>
                      <TooltipTrigger asChild>
                        <li
                          className={cn(
                            'flex-1',
                            SLA_DAY_STATUS_CLASS[day.status]
                          )}>
                          <span className="sr-only">{dayDetails(day)}</span>
                        </li>
                      </TooltipTrigger>
                      <TooltipContent>{dayDetails(day)}</TooltipContent>
                    </Tooltip>
                  ))}
                </ol>
                <span className="text-sm text-default-secondary">{label}</span>
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    </figure>
  );
};
