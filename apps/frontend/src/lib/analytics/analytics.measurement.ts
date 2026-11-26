import {
  GA_MEASUREMENT_ID,
  GA_PRODUCTION_HOST,
} from '@/lib/analytics/analytics.consts';

export const getProductionGaMeasurementId = (
  host: string | null
): string | undefined =>
  host === GA_PRODUCTION_HOST ? GA_MEASUREMENT_ID : undefined;
