import {
  type AnalyticsDomainPrefix,
  type AnalyticsElementDefinition,
} from '@/lib/analytics/analytics.ids';

export const ANALYTICS_ELEMENT_IDS = {} as const satisfies Record<
  `${AnalyticsDomainPrefix}_${string}`,
  AnalyticsElementDefinition
>;
