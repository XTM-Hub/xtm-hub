import {
  ANALYTICS_RESOURCE_STATUS_ATTRIBUTE,
  ANALYTICS_USE_CASES_ATTRIBUTE,
} from '@/lib/analytics/analytics.consts';
import {
  analyticsResource,
  toAnalyticsResourceData,
} from '@/lib/analytics/analytics.context';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { describe, expect, it } from 'vitest';

const RESOURCE_UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const RESOURCE_NAME = 'Ransomware playbook';
const RESOURCE_STATUS = 'published';
const UNKNOWN_RESOURCE_TYPE = 'unknown_resource';

describe('analyticsResource', () => {
  it.each([
    [
      'Detection|Phishing|Threat hunting',
      'several use cases',
      [{ name: 'Threat hunting' }, { name: 'Detection' }, { name: 'Phishing' }],
    ],
    [undefined, 'no use case', []],
    [undefined, 'missing use cases', null],
  ])(
    'should set the use cases to %s when the resource has %s',
    (expected, _context, useCases) => {
      // Given / When
      const attributes = analyticsResource({
        id: RESOURCE_UUID,
        name: RESOURCE_NAME,
        type: ShareableResourceType.OPENCTI_PLAYBOOK,
        status: RESOURCE_STATUS,
        useCases,
      });

      // Then
      expect(attributes[ANALYTICS_USE_CASES_ATTRIBUTE]).toBe(expected);
    }
  );

  it('should return no attributes when the resource type is unknown', () => {
    // Given / When
    const attributes = analyticsResource({
      id: RESOURCE_UUID,
      name: RESOURCE_NAME,
      type: UNKNOWN_RESOURCE_TYPE,
      status: RESOURCE_STATUS,
    });

    // Then
    expect(attributes).toEqual({});
  });

  it.each(['draft', 'in_validation', 'published'])(
    'should set the status attribute to %s when the resource has that status',
    (status) => {
      // Given / When
      const attributes = analyticsResource({
        id: RESOURCE_UUID,
        name: RESOURCE_NAME,
        type: ShareableResourceType.OPENCTI_PLAYBOOK,
        status,
      });

      // Then
      expect(attributes[ANALYTICS_RESOURCE_STATUS_ATTRIBUTE]).toBe(status);
    }
  );
});

describe('toAnalyticsResourceData', () => {
  it('should carry the status of the document', () => {
    // Given / When
    const data = toAnalyticsResourceData({
      id: RESOURCE_UUID,
      name: RESOURCE_NAME,
      type: ShareableResourceType.OPENCTI_PLAYBOOK,
      status: 'published',
    });

    // Then
    expect(data.status).toBe('published');
  });
});
