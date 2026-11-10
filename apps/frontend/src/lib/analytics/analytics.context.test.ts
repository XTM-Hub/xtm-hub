import { ANALYTICS_USE_CASES_ATTRIBUTE } from '@/lib/analytics/analytics.consts';
import { analyticsResource } from '@/lib/analytics/analytics.context';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { describe, expect, it } from 'vitest';

const RESOURCE_UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const RESOURCE_NAME = 'Ransomware playbook';

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
        useCases,
      });

      // Then
      expect(attributes[ANALYTICS_USE_CASES_ATTRIBUTE]).toBe(expected);
    }
  );
});
