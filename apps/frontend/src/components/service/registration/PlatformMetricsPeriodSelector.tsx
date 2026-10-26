'use client';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTranslate } from '@/hooks/use-translate';
import { SaasPlatformMetricsPeriod } from '@graphql/generated';

interface PlatformMetricsPeriodSelectorProps {
  period: SaasPlatformMetricsPeriod;
  onPeriodChange: (period: SaasPlatformMetricsPeriod) => void;
  disabled?: boolean;
}

const PERIODS = Object.values(SaasPlatformMetricsPeriod);

export const PlatformMetricsPeriodSelector = ({
  period,
  onPeriodChange,
  disabled,
}: PlatformMetricsPeriodSelectorProps) => {
  const t = useTranslate();

  return (
    <SegmentedControl
      aria-label={t('Register.Metrics.Period.Label')}
      items={PERIODS.map((option) => ({
        value: option,
        label: t(`Register.Metrics.Period.${option}`),
      }))}
      value={period}
      onValueChange={onPeriodChange}
      size="md"
      disabled={disabled}
    />
  );
};
