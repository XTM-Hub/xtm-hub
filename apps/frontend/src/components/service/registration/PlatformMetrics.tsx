'use client';

import { findMetricPoints } from '@/components/service/registration/platform-metrics.utils';
import { StorageUsageChart } from '@/components/service/registration/StorageUsageChart';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslate } from '@/hooks/use-translate';
import { MetricType, SaasPlatformMetrics } from '@graphql/generated';

interface PlatformMetricsProps {
  metrics?: SaasPlatformMetrics | null;
  isLoading: boolean;
}

export const PlatformMetrics = ({
  metrics,
  isLoading,
}: PlatformMetricsProps) => {
  const t = useTranslate();

  return (
    <div className="my-3 layer-2 bg-filigran-brand-primary-transparency-10 p-6">
      <h2>{t('Register.Metrics.Title')}</h2>
      <Separator className="m-3" />
      {isLoading && (
        <section aria-busy="true">
          <Skeleton className="h-40 w-full" />
        </section>
      )}
      {!isLoading && !metrics && (
        <p className="text-sm">{t('Register.Metrics.Unavailable')}</p>
      )}
      {!isLoading && metrics && (
        <div className="grid w-full grid-cols-2 gap-4">
          <StorageUsageChart
            points={findMetricPoints(metrics, MetricType.EsUsedSize)}
            graphType={'Database'}
            color="var(--color-filigran-brand-primary)"
          />
          <StorageUsageChart
            points={findMetricPoints(metrics, MetricType.S3UsedSize)}
            graphType={'FileStorage'}
            color="var(--color-filigran-tonic-secondary)"
          />
        </div>
      )}
    </div>
  );
};
