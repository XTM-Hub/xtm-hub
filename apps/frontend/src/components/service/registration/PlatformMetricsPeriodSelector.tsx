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
const COMING_SOON_PERIODS = new Set([SaasPlatformMetricsPeriod.Last_180Days]);

export const PlatformMetricsPeriodSelector = ({
  period,
  onPeriodChange,
  disabled,
}: PlatformMetricsPeriodSelectorProps) => {
  const t = useTranslate();

  return (
    <SegmentedControl
      aria-label={t('Register.Metrics.Period.Label')}
      items={PERIODS.map((option) => {
        const isComingSoon = COMING_SOON_PERIODS.has(option);
        return {
          value: option,
          label: t(`Register.Metrics.Period.${option}`),
          disabled: isComingSoon,
          tooltip: isComingSoon
            ? t('Register.Metrics.Period.ComingSoon')
            : undefined,
        };
      })}
      value={period}
      onValueChange={onPeriodChange}
      size="md"
      disabled={disabled}
    />
  );
};
