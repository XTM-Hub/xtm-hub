'use client';

import {
  SLA_PERCENT_FORMAT,
  SlaMonth,
} from '@/components/service/registration/sla-availability-chart.utils';
import { useTranslate } from '@/hooks/use-translate';
import { DateTimeFormatOptions, useFormatter } from 'next-intl';

export const useSlaFormat = (monthFormat: DateTimeFormatOptions) => {
  const t = useTranslate();
  const format = useFormatter();

  const formatAvailability = (availability: number | null) =>
    availability === null
      ? t('Register.Metrics.SLA.NoData')
      : format.number(availability, SLA_PERCENT_FORMAT);

  const formatMonth = (
    { start, isCurrent }: SlaMonth,
    currentMonthKey = 'Register.Metrics.SLA.MonthToDate'
  ) => {
    const month = format.dateTime(start, monthFormat);
    return isCurrent ? t(currentMonthKey, { month }) : month;
  };

  return { formatAvailability, formatMonth };
};
