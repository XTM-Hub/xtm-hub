import { findAnalyticsRegistryErrors } from '@/lib/analytics/analytics.ids';
import { ANALYTICS_ELEMENT_IDS } from '@/lib/analytics/analytics.registry';
import { describe, expect, it } from 'vitest';

const SHARE_ACTION = 'Share resource';

describe('findAnalyticsRegistryErrors', () => {
  it('should find no error when every key and action follows the contract', () => {
    // Given
    const registry = {
      resource_download: { action: 'Download resource' },
      resource_download_signup: { action: 'Sign up to download resource' },
      trial_guide_documentation_open: {
        action: 'Open documentation from trial guide',
      },
      ee_details_open: { action: 'Open Enterprise Edition details' },
    };

    // When
    const errors = findAnalyticsRegistryErrors(registry);

    // Then
    expect(errors).toEqual([]);
  });

  it.each([
    [
      'a key that is not snake_case',
      { resource_Csv_download: { action: 'Download resource CSV' } },
      ['resource_Csv_download: the key is not snake_case'],
    ],
    [
      'a key whose domain is not in the list',
      { table_page_open: { action: 'Open table page' } },
      ['table_page_open: the domain is not in the list'],
    ],
    [
      'a key whose verb is not in the list',
      { resource_link_follow: { action: 'Follow resource link' } },
      ['resource_link_follow: the verb is not in the list'],
    ],
    [
      'a sign-up key without a verb before the suffix',
      { roadmap_feature_signup: { action: 'Sign up from feature' } },
      ['roadmap_feature_signup: the verb is not in the list'],
    ],
    [
      'an action used twice',
      {
        resource_share: { action: SHARE_ACTION },
        roadmap_epic_share: { action: SHARE_ACTION },
      },
      [
        `resource_share: the action "${SHARE_ACTION}" is not unique`,
        `roadmap_epic_share: the action "${SHARE_ACTION}" is not unique`,
      ],
    ],
    [
      'an action starting with Click',
      { roadmap_feature_vote: { action: 'Click Vote on a feature' } },
      [
        'roadmap_feature_vote: the action "Click Vote on a feature" starts with Click',
      ],
    ],
  ])(
    'should report an error when the registry has %s',
    (_case, registry, expectedErrors) => {
      // Given / When
      const errors = findAnalyticsRegistryErrors(registry);

      // Then
      expect(errors).toEqual(expectedErrors);
    }
  );

  it('should find no error when checking the analytics registry', () => {
    // Given / When
    const errors = findAnalyticsRegistryErrors(ANALYTICS_ELEMENT_IDS);

    // Then
    expect(errors).toEqual([]);
  });
});
