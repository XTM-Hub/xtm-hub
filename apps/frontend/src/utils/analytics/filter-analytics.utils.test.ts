import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import {
  type AnalyticsFilter,
  buildFilterApplyEvents,
} from '@/utils/analytics/filter-analytics.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { describe, expect, it } from 'vitest';

const AUTOMATIC_DEPLOY = 'true';
const AUTOMATIC_DEPLOY_LABEL = 'Automatic deploy';
const MANUAL_DEPLOY = 'false';
const MANUAL_DEPLOY_LABEL = 'Manual deploy';
const PREVIOUS_VERSION = '6.5.0';
const NEXT_VERSION = '6.6.0';

const DEPLOYMENT_TYPE_FILTER: AnalyticsFilter = {
  filterKey: ServiceListFilterKey.ManagerSupported,
  resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
  valueLabels: {
    [AUTOMATIC_DEPLOY]: AUTOMATIC_DEPLOY_LABEL,
    [MANUAL_DEPLOY]: MANUAL_DEPLOY_LABEL,
  },
};

const PRODUCT_VERSION_FILTER: AnalyticsFilter = {
  filterKey: ServiceListFilterKey.ProductVersion,
  resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
};

describe('buildFilterApplyEvents', () => {
  it.each([
    ['Add', 'checked', {}, { [AUTOMATIC_DEPLOY]: [] }],
    ['Remove', 'unchecked', { [AUTOMATIC_DEPLOY]: [] }, {}],
  ])(
    'should send the readable label of the value as %s when the value is %s',
    (expectedAction, _context, previous, next) => {
      // Given / When
      const events = buildFilterApplyEvents(
        DEPLOYMENT_TYPE_FILTER,
        previous,
        next
      );

      // Then
      expect(events).toEqual([
        {
          filter_name: 'Deployment type',
          filter_value: AUTOMATIC_DEPLOY_LABEL,
          filter_action: expectedAction,
          library: 'Integrations',
          product: 'OpenCTI',
        },
      ]);
    }
  );

  it('should send only the newly checked value when another value stays checked', () => {
    // Given / When
    const events = buildFilterApplyEvents(
      DEPLOYMENT_TYPE_FILTER,
      { [AUTOMATIC_DEPLOY]: [] },
      { [AUTOMATIC_DEPLOY]: [], [MANUAL_DEPLOY]: [] }
    );

    // Then
    expect(
      events.map(({ filter_value, filter_action }) => [
        filter_value,
        filter_action,
      ])
    ).toEqual([[MANUAL_DEPLOY_LABEL, 'Add']]);
  });

  it('should send the new value as added and the old one as removed when a value replaces another', () => {
    // Given / When
    const events = buildFilterApplyEvents(
      PRODUCT_VERSION_FILTER,
      { [PREVIOUS_VERSION]: [] },
      { [NEXT_VERSION]: [] }
    );

    // Then
    expect(
      events.map(({ filter_value, filter_action }) => [
        filter_value,
        filter_action,
      ])
    ).toEqual([
      [NEXT_VERSION, 'Add'],
      [PREVIOUS_VERSION, 'Remove'],
    ]);
  });
});
