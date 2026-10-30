'use client';

import {
  SLA_PERCENT_FORMAT,
  SLA_STATUS_CHIP_SEVERITY,
  SlaMonth,
} from '@/components/service/registration/sla-availability-chart.utils';
import { SlaStatusDot } from '@/components/service/registration/SlaStatusDot';
import { useSlaFormat } from '@/components/service/registration/use-sla-format';
import { useTranslate } from '@/hooks/use-translate';
import { Chip } from '@filigran/design-system';
import { useFormatter } from 'next-intl';
import { useMemo } from 'react';

interface SlaMonthlySummaryProps {
  // The months of the chart, the oldest first.
  months: SlaMonth[];
  target: number;
}

// The months are UTC months, as the SaaS Manager counts them.
const MONTH_FORMAT = {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
} as const;

export const SlaMonthlySummary = ({
  months,
  target,
}: SlaMonthlySummaryProps) => {
  const t = useTranslate();
  const format = useFormatter();
  const { formatAvailability, formatMonth } = useSlaFormat(MONTH_FORMAT);
  // The summary reads from the current month back.
  const recentFirst = useMemo(() => [...months].reverse(), [months]);
  const formattedTarget = format.number(target, SLA_PERCENT_FORMAT);

  const singleMonth = months.length === 1 ? months[0] : undefined;
  if (singleMonth) {
    const { availability, status, days } = singleMonth;
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-default-secondary">
          {formatMonth(
            singleMonth,
            'Register.Metrics.SLA.Summary.CurrentMonth'
          )}
        </p>
        <p className="title-xl">{formatAvailability(availability)}</p>
        {availability !== null && (
          <Chip
            label={t(`Register.Metrics.SLA.Legend.${status}`)}
            severity={SLA_STATUS_CHIP_SEVERITY[status]}
          />
        )}
        <p className="text-sm text-default-secondary">
          {t('Register.Metrics.SLA.Summary.TargetAndMeasuredDays', {
            target: formattedTarget,
            measured: days.filter((day) => day.availability !== null).length,
            total: days.length,
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-default-secondary">
        {t('Register.Metrics.SLA.Summary.Title', { target: formattedTarget })}
      </p>
      <dl className="flex flex-col gap-2">
        {recentFirst.map((month) => (
          <div
            key={month.start.toISOString()}
            className="flex items-center justify-between gap-4">
            <dt>{formatMonth(month)}</dt>
            <dd className="flex items-center gap-2 font-semibold">
              {formatAvailability(month.availability)}
              <SlaStatusDot status={month.status} />
              {month.availability !== null && (
                <span className="sr-only">
                  {t(`Register.Metrics.SLA.Legend.${month.status}`)}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
