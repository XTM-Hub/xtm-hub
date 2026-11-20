import {
  DATABASE_ENGINE_NAME,
  type DatabaseEngine,
} from '@/components/service/registration/platform-metrics.utils';
import type { AppTourAnalyticsIds } from '@/components/tour/AppTour';
import { useTranslate } from '@/hooks/use-translate';
import type { StepType } from '@reactour/tour';

// Each element the tour points at carries one of these values in its `data-tour` attribute.
export const PLATFORM_METRICS_TOUR_TARGET = {
  Metrics: 'platform-metrics',
  PeriodSelector: 'platform-metrics-period-selector',
  StorageCharts: 'platform-metrics-storage-charts',
  DatabaseChart: 'platform-metrics-database-chart',
  FileStorageChart: 'platform-metrics-file-storage-chart',
  SlaChart: 'platform-metrics-sla-chart',
} as const;

export type PlatformMetricsTourTarget =
  (typeof PLATFORM_METRICS_TOUR_TARGET)[keyof typeof PLATFORM_METRICS_TOUR_TARGET];

export const platformMetricsTourTarget = (
  target: PlatformMetricsTourTarget
) => ({
  'data-tour': target,
});

const selectTarget = (target: PlatformMetricsTourTarget) =>
  `[data-tour="${target}"]`;

export const PLATFORM_METRICS_TOUR_ANALYTICS_IDS: AppTourAnalyticsIds = {
  close: 'platform_metrics_tour_close',
  previousStep: 'platform_metrics_tour_previous_step_open',
  nextStep: 'platform_metrics_tour_next_step_open',
};

export const getPlatformMetricsTourSteps = (
  t: ReturnType<typeof useTranslate>,
  databaseEngine: DatabaseEngine,
  // The formatted SLA target, undefined when the platform has no SLA chart to point at.
  slaTarget: string | undefined
): StepType[] => [
  {
    selector: selectTarget(PLATFORM_METRICS_TOUR_TARGET.Metrics),
    content: t('Register.Metrics.Tour.Source'),
  },
  {
    selector: selectTarget(PLATFORM_METRICS_TOUR_TARGET.DatabaseChart),
    content: t('Register.Metrics.Tour.Database', {
      database: DATABASE_ENGINE_NAME[databaseEngine],
    }),
  },
  {
    selector: selectTarget(PLATFORM_METRICS_TOUR_TARGET.FileStorageChart),
    content: t('Register.Metrics.Tour.FileStorage'),
  },
  {
    // The period selector sits above the charts: the step highlights both, as one area.
    selector: selectTarget(PLATFORM_METRICS_TOUR_TARGET.StorageCharts),
    highlightedSelectors: [
      selectTarget(PLATFORM_METRICS_TOUR_TARGET.PeriodSelector),
      selectTarget(PLATFORM_METRICS_TOUR_TARGET.StorageCharts),
    ],
    content: t('Register.Metrics.Tour.ChartAxes'),
  },
  ...(slaTarget === undefined
    ? []
    : [
        {
          selector: selectTarget(PLATFORM_METRICS_TOUR_TARGET.SlaChart),
          content: t('Register.Metrics.Tour.Sla', { target: slaTarget }),
        },
      ]),
];
