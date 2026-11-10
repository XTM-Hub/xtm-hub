import {
  GA_MEASUREMENT_ID,
  GA_PRODUCTION_HOST,
} from '@/lib/analytics/analytics.consts';
import { getProductionGaMeasurementId } from '@/lib/analytics/analytics.measurement';
import { describe, expect, it } from 'vitest';

describe('getProductionGaMeasurementId', () => {
  it.each([
    [GA_MEASUREMENT_ID, GA_PRODUCTION_HOST],
    [undefined, 'hub.staging.filigran.io'],
    [undefined, 'hub.filigran.io.example.com'],
    [undefined, 'localhost:3002'],
    [undefined, 'hub.filigran.io:443'],
    [undefined, null],
  ])('should return %s when the request host is %s', (measurementId, host) => {
    // Given / When
    const result = getProductionGaMeasurementId(host);

    // Then
    expect(result).toBe(measurementId);
  });
});
