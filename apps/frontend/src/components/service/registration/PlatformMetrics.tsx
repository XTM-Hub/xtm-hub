'use client';

import {
  getPlatformMetricsTourSteps,
  PLATFORM_METRICS_TOUR_ANALYTICS_IDS,
  PLATFORM_METRICS_TOUR_TARGET,
  platformMetricsTourTarget,
} from '@/components/service/registration/platform-metrics-tour';
import {
  findDatabaseUsage,
  findMetricPoints,
} from '@/components/service/registration/platform-metrics.utils';
import { PlatformMetricsPeriodSelector } from '@/components/service/registration/PlatformMetricsPeriodSelector';
import { SLA_PERCENT_FORMAT } from '@/components/service/registration/sla-availability-chart.utils';
import { SlaAvailabilityChart } from '@/components/service/registration/SlaAvailabilityChart';
import { StorageUsageChart } from '@/components/service/registration/StorageUsageChart';
import { AppTourButton, AppTourProvider } from '@/components/tour/AppTour';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalyticsEnabled } from '@/hooks/use-analytics-enabled';
import { useTranslate } from '@/hooks/use-translate';
import { trackEvent } from '@/lib/analytics/analytics.client';
import {
  METRICS_PERIOD_LABELS,
  PRODUCT_LABELS,
} from '@/lib/analytics/analytics.consts';
import { Paper } from '@filigran/design-system';
import {
  MetricType,
  PlatformIdentifier,
  SaasPlatformMetrics,
  SaasPlatformMetricsPeriod,
  SaasPlatformSla,
  SaasPlatformStorage,
} from '@graphql/generated';
import { useFormatter } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';

interface PlatformMetricsProps {
  platformIdentifier: PlatformIdentifier;
  metrics?: SaasPlatformMetrics | null;
  storage?: SaasPlatformStorage | null;
  // Null without any SLA to show: the section is left out.
  sla?: SaasPlatformSla | null;
  isLoading: boolean;
  period: SaasPlatformMetricsPeriod;
  onPeriodChange: (period: SaasPlatformMetricsPeriod) => void;
  // For the Filigran teams only: the tour explains where the metrics come from.
  showGuidedTour?: boolean;
}

export const PlatformMetrics = ({
  platformIdentifier,
  metrics,
  storage,
  sla,
  isLoading,
  period,
  onPeriodChange,
  showGuidedTour = false,
}: PlatformMetricsProps) => {
  const t = useTranslate();
  const format = useFormatter();
  const isAnalyticsEnabled = useAnalyticsEnabled();
  const isViewTracked = useRef(false);

  useEffect(() => {
    if (!isAnalyticsEnabled) {
      isViewTracked.current = false;
      return;
    }
    if (isViewTracked.current) {
      return;
    }
    isViewTracked.current = true;
    trackEvent('view_platform_metrics', {
      product: PRODUCT_LABELS[platformIdentifier],
      period: METRICS_PERIOD_LABELS[period],
    });
  }, [isAnalyticsEnabled, platformIdentifier, period]);

  // Another period would not bring the metrics back: the storage does not depend on it.
  const isUnavailable = !isLoading && !metrics && !storage;
  const hasCharts = !isLoading && !!(metrics || storage);
  const databaseUsage = findDatabaseUsage(metrics, storage);
  const slaTarget = sla
    ? format.number(sla.target, SLA_PERCENT_FORMAT)
    : undefined;
  const tourSteps = useMemo(
    () => getPlatformMetricsTourSteps(t, databaseUsage.engine, slaTarget),
    [t, databaseUsage.engine, slaTarget]
  );

  return (
    <AppTourProvider
      key={`${hasCharts}-${tourSteps.length}`}
      steps={tourSteps}
      analyticsIds={PLATFORM_METRICS_TOUR_ANALYTICS_IDS}>
      <Paper
        {...platformMetricsTourTarget(PLATFORM_METRICS_TOUR_TARGET.Metrics)}
        className="mt-3">
        <div className="flex items-center justify-between gap-4">
          <h2>{t('Register.Metrics.Title')}</h2>
          <div className="flex items-center gap-2">
            {/* The tour points at the charts: it starts once they show. */}
            {showGuidedTour && hasCharts && (
              <AppTourButton analyticsId="platform_metrics_tour_open" />
            )}
            <div
              {...platformMetricsTourTarget(
                PLATFORM_METRICS_TOUR_TARGET.PeriodSelector
              )}>
              <PlatformMetricsPeriodSelector
                period={period}
                onPeriodChange={onPeriodChange}
                disabled={isUnavailable}
              />
            </div>
          </div>
        </div>
        <Separator className="mr-3 my-3" />
        {isLoading && (
          <section aria-busy="true">
            <Skeleton className="h-40 w-full" />
          </section>
        )}
        {isUnavailable && (
          <p className="text-sm">{t('Register.Metrics.Unavailable')}</p>
        )}

        {hasCharts && (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h3 className="title-xs">{t('Register.Metrics.StorageTitle')}</h3>
              <div
                {...platformMetricsTourTarget(
                  PLATFORM_METRICS_TOUR_TARGET.StorageCharts
                )}
                className="grid w-full grid-cols-2 gap-4">
                <div
                  {...platformMetricsTourTarget(
                    PLATFORM_METRICS_TOUR_TARGET.DatabaseChart
                  )}>
                  <StorageUsageChart
                    points={databaseUsage.points}
                    storage={databaseUsage.storage}
                    graphType={'Database'}
                    color="var(--color-filigran-brand-primary)"
                  />
                </div>
                <div
                  {...platformMetricsTourTarget(
                    PLATFORM_METRICS_TOUR_TARGET.FileStorageChart
                  )}>
                  <StorageUsageChart
                    points={findMetricPoints(metrics, MetricType.S3UsedSize)}
                    storage={storage?.s3_used_size}
                    graphType={'FileStorage'}
                    color="var(--color-filigran-tonic-secondary)"
                  />
                </div>
              </div>
            </section>
            {sla && (
              <div
                {...platformMetricsTourTarget(
                  PLATFORM_METRICS_TOUR_TARGET.SlaChart
                )}>
                <SlaAvailabilityChart sla={sla} />
              </div>
            )}
          </div>
        )}
      </Paper>
    </AppTourProvider>
  );
};
