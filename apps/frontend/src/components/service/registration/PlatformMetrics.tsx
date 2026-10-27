'use client';

import { findMetricPoints } from '@/components/service/registration/platform-metrics.utils';
import { PlatformMetricsPeriodSelector } from '@/components/service/registration/PlatformMetricsPeriodSelector';
import { SlaUsageChart } from '@/components/service/registration/SlaUsageChart';
import { StorageUsageChart } from '@/components/service/registration/StorageUsageChart';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslate } from '@/hooks/use-translate';
import {
  MetricType,
  SaasPlatformMetrics,
  SaasPlatformMetricsPeriod,
  SaasPlatformStorage,
} from '@graphql/generated';

interface PlatformMetricsProps {
  metrics?: SaasPlatformMetrics | null;
  storage?: SaasPlatformStorage | null;
  isLoading: boolean;
  period: SaasPlatformMetricsPeriod;
  onPeriodChange: (period: SaasPlatformMetricsPeriod) => void;
}

export const PlatformMetrics = ({
  metrics,
  storage,
  isLoading,
  period,
  onPeriodChange,
}: PlatformMetricsProps) => {
  const t = useTranslate();
  // Another period would not bring the metrics back: the storage does not depend on it.
  const isUnavailable = !isLoading && !metrics && !storage;

  return (
    <div className="my-3 layer-2 bg-filigran-brand-primary-transparency-10 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2>{t('Register.Metrics.Title')}</h2>
        <PlatformMetricsPeriodSelector
          period={period}
          onPeriodChange={onPeriodChange}
          disabled={isUnavailable}
        />
      </div>
      <Separator className="m-3" />
      {isLoading && (
        <section aria-busy="true">
          <Skeleton className="h-40 w-full" />
        </section>
      )}
      {isUnavailable && (
        <p className="text-sm">{t('Register.Metrics.Unavailable')}</p>
      )}

      {!isLoading && (metrics || storage) && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h3 className="title-xs">{t('Register.Metrics.StorageTitle')}</h3>
            <div className="grid w-full grid-cols-2 gap-4">
              <StorageUsageChart
                points={findMetricPoints(metrics, MetricType.EsUsedSize)}
                storage={storage?.es_used_size}
                graphType={'Database'}
                color="var(--color-filigran-brand-primary)"
              />
              <StorageUsageChart
                points={findMetricPoints(metrics, MetricType.S3UsedSize)}
                storage={storage?.s3_used_size}
                graphType={'FileStorage'}
                color="var(--color-filigran-tonic-secondary)"
              />
            </div>
          </section>
          <SlaUsageChart
            points={findMetricPoints(metrics, MetricType.SlaAvailability)}
            period={period}
          />
        </div>
      )}
    </div>
  );
};
