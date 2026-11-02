'use client';

import {
  SLA_STATUS_CLASS,
  SlaDay,
  SlaMissingDayReason,
  slaMissingDayReason,
  SlaMonth,
  SlaStatus,
  toSlaMonths,
} from '@/components/service/registration/sla-availability-chart.utils';
import { SlaMonthlySummary } from '@/components/service/registration/SlaMonthlySummary';
import { SlaStatusDot } from '@/components/service/registration/SlaStatusDot';
import { useSlaFormat } from '@/components/service/registration/use-sla-format';
import { Separator } from '@/components/ui/separator';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { SaasPlatformSla } from '@graphql/generated';
import { useFormatter } from 'next-intl';
import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';

interface SlaAvailabilityChartProps {
  sla: SaasPlatformSla;
}

interface ActiveDay {
  monthIndex: number;
  dayIndex: number;
}

// The days are UTC days, as the SaaS Manager counts them.
const DAY_FORMAT = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const;
const MONTH_FORMAT = { month: 'short', timeZone: 'UTC' } as const;
const LEGEND_STATUSES: SlaStatus[] = ['Met', 'Missed', 'Unknown'];
// A day still to come reads like the grey bar's legend entry.
const MISSING_DAY_LABEL: Record<SlaMissingDayReason, string> = {
  NotTrackedYet: 'Register.Metrics.SLA.NotTrackedYet',
  Upcoming: 'Register.Metrics.SLA.Legend.Unknown',
  NoData: 'Register.Metrics.SLA.NoData',
};

export const SlaAvailabilityChart = ({ sla }: SlaAvailabilityChartProps) => {
  const t = useTranslate();
  const format = useFormatter();
  const { formatAvailability, formatMonth } = useSlaFormat(MONTH_FORMAT);
  const months = useMemo(() => toSlaMonths(sla), [sla]);
  const now = new Date();
  const isSingleMonth = months.length === 1;
  const [activeDay, setActiveDay] = useState<ActiveDay | null>(null);
  const activeSlaDay =
    activeDay && months[activeDay.monthIndex]?.days[activeDay.dayIndex];

  const activate = useCallback((monthIndex: number, dayIndex: number) => {
    setActiveDay((previous) =>
      previous?.monthIndex === monthIndex && previous.dayIndex === dayIndex
        ? previous
        : { monthIndex, dayIndex }
    );
  }, []);

  const onBarsPointerOver = (event: PointerEvent<HTMLDivElement>) => {
    const bar =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-day-index]')
        : null;
    // Over a gap between two bars, the previous day stays active instead of flickering.
    if (bar) {
      activate(Number(bar.dataset.monthIndex), Number(bar.dataset.dayIndex));
    }
  };

  const onMonthFocus = (monthIndex: number) => {
    setActiveDay((previous) =>
      previous?.monthIndex === monthIndex
        ? previous
        : { monthIndex, dayIndex: 0 }
    );
  };

  const onMonthKeyDown = (
    event: KeyboardEvent<HTMLOListElement>,
    monthIndex: number,
    dayCount: number
  ) => {
    if (event.key === 'Escape') {
      setActiveDay(null);
      return;
    }
    const lastIndex = dayCount - 1;
    const current =
      activeDay?.monthIndex === monthIndex ? activeDay.dayIndex : 0;
    const next: Partial<Record<string, number>> = {
      ArrowLeft: Math.max(current - 1, 0),
      ArrowRight: Math.min(current + 1, lastIndex),
      Home: 0,
      End: lastIndex,
    };
    const dayIndex = next[event.key];
    if (dayIndex !== undefined) {
      event.preventDefault();
      activate(monthIndex, dayIndex);
    }
  };

  const monthLabel = (month: SlaMonth) => {
    if (isSingleMonth) {
      const lastDay = month.days[month.days.length - 1];
      return t('Register.Metrics.SLA.MonthRange', {
        start: format.dateTime(month.start, DAY_FORMAT),
        end: format.dateTime(lastDay?.date ?? month.start, DAY_FORMAT),
      });
    }
    return formatMonth(month);
  };

  const dayStatusLabel = ({ date, availability, status }: SlaDay) => {
    const value = formatAvailability(availability);
    if (availability === null) {
      return t(MISSING_DAY_LABEL[slaMissingDayReason(date, now)]);
    }
    return status === 'Met'
      ? t('Register.Metrics.SLA.OnTarget', { availability: value })
      : t('Register.Metrics.SLA.BelowTarget', { availability: value });
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
              <SlaStatusDot status={status} />
              {t(`Register.Metrics.SLA.Legend.${status}`)}
            </span>
          ))}
        </div>
      </figcaption>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-60 lg:shrink-0">
          <SlaMonthlySummary
            months={months}
            target={sla.target}
          />
        </div>
        <Separator
          orientation="vertical"
          className="hidden h-auto self-stretch lg:block"
        />
        <TooltipProvider>
          {/* One tooltip for every bar, driven by the active day rather than by each bar's own hover. */}
          <Tooltip
            open={Boolean(activeSlaDay)}
            onOpenChange={(open) => {
              if (!open) {
                setActiveDay(null);
              }
            }}>
            <div
              className="flex min-w-0 flex-1 items-center gap-2"
              onPointerOver={onBarsPointerOver}
              onPointerLeave={() => setActiveDay(null)}>
              {months.map((month, monthIndex) => {
                const label = monthLabel(month);
                return (
                  <div
                    key={month.start.toISOString()}
                    className="flex flex-col items-center gap-2"
                    // A month takes a width in proportion to its days, so every bar is as wide.
                    style={{ flexGrow: month.days.length, flexBasis: 0 }}>
                    <ol
                      aria-label={label}
                      tabIndex={0}
                      onFocus={() => onMonthFocus(monthIndex)}
                      onBlur={() => setActiveDay(null)}
                      onKeyDown={(event) =>
                        onMonthKeyDown(event, monthIndex, month.days.length)
                      }
                      className={cn(
                        'flex h-12 w-full list-none rounded-xs pl-0 outline-focus focus-visible:outline-2 focus-visible:outline-offset-4',
                        isSingleMonth ? 'gap-1' : 'gap-px'
                      )}>
                      {month.days.map((day, dayIndex) => {
                        const isActive =
                          activeDay?.monthIndex === monthIndex &&
                          activeDay.dayIndex === dayIndex;
                        return (
                          <li
                            key={day.date.toISOString()}
                            data-month-index={monthIndex}
                            data-day-index={dayIndex}
                            className={cn(
                              'relative flex-1',
                              SLA_STATUS_CLASS[day.status],
                              isActive &&
                                'outline-2 outline-offset-1 outline-focus'
                            )}>
                            <span className="sr-only">{dayDetails(day)}</span>
                            {isActive && (
                              <TooltipTrigger asChild>
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-0"
                                />
                              </TooltipTrigger>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                    <span className="text-sm text-default-secondary">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            {activeSlaDay && (
              // A visual copy of the day's sr-only text: hidden so a screen reader reads each day once.
              <TooltipContent
                aria-hidden="true"
                className="pointer-events-none"
                updatePositionStrategy="always">
                {dayDetails(activeSlaDay)}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </figure>
  );
};
