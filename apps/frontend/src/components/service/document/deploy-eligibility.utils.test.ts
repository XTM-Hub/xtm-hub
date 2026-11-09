import { resolveDeployEligibility } from '@/components/service/document/deploy-eligibility.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { type useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { LicenseType } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const REQUIRED_VERSION = '6.5.0';
const OLD_VERSION = '6.4.0';
const RECENT_VERSION = '6.6.0';

const CUSTOM_DASHBOARD = {
  type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
};
const PLAYBOOK = { type: ShareableResourceType.OPENCTI_PLAYBOOK };
const FREE_CONNECTOR = {
  type: ShareableResourceType.OPENCTI_INTEGRATION,
  license_type: LicenseType.Free,
};
const COMMERCIAL_CONNECTOR = {
  type: ShareableResourceType.OPENCTI_INTEGRATION,
  license_type: LicenseType.Commercial,
};

type Platform = Pick<
  useRegisteredPlatformsFragment$data,
  'contract' | 'version'
>;

const OLD_EE_PLATFORM: Platform = { contract: 'EE', version: OLD_VERSION };
const OLD_CE_PLATFORM: Platform = { contract: 'CE', version: OLD_VERSION };
const RECENT_CE_PLATFORM: Platform = {
  contract: 'CE',
  version: RECENT_VERSION,
};
const UNKNOWN_VERSION_PLATFORM: Platform = { contract: 'EE', version: null };
const RECENT_TRIAL_PLATFORM: Platform = {
  contract: 'trial',
  version: RECENT_VERSION,
};

describe('resolveDeployEligibility', () => {
  it.each([
    [
      'No platform connected',
      'no platform is connected',
      CUSTOM_DASHBOARD,
      [],
      null,
    ],
    [
      'Enterprise Edition required',
      'a playbook only has Community Edition platforms',
      PLAYBOOK,
      [RECENT_CE_PLATFORM],
      null,
    ],
    [
      'Enterprise Edition required',
      'a commercial connector only has old Community Edition platforms',
      COMMERCIAL_CONNECTOR,
      [OLD_CE_PLATFORM],
      REQUIRED_VERSION,
    ],
    [
      'Platform version too old',
      'the only platform of a free connector is an old Community Edition one',
      FREE_CONNECTOR,
      [OLD_CE_PLATFORM],
      REQUIRED_VERSION,
    ],
    [
      'Platform version too old',
      'every platform is too old for a free connector',
      FREE_CONNECTOR,
      [OLD_CE_PLATFORM, OLD_EE_PLATFORM],
      REQUIRED_VERSION,
    ],
    [
      'Platform version too old',
      'the only platform of a free connector has an unknown version',
      FREE_CONNECTOR,
      [UNKNOWN_VERSION_PLATFORM],
      REQUIRED_VERSION,
    ],
    [
      'Platform version too old',
      'a commercial connector has an old Enterprise Edition platform and a recent Community Edition one',
      COMMERCIAL_CONNECTOR,
      [OLD_EE_PLATFORM, RECENT_CE_PLATFORM],
      REQUIRED_VERSION,
    ],
    [
      'Can deploy',
      'one platform out of two is recent enough for a free connector',
      FREE_CONNECTOR,
      [OLD_EE_PLATFORM, RECENT_CE_PLATFORM],
      REQUIRED_VERSION,
    ],
    [
      'Can deploy',
      'a custom dashboard has an old Community Edition platform',
      CUSTOM_DASHBOARD,
      [OLD_CE_PLATFORM],
      null,
    ],
    [
      'Can deploy',
      'a playbook has a trial platform',
      PLAYBOOK,
      [RECENT_CE_PLATFORM, RECENT_TRIAL_PLATFORM],
      null,
    ],
  ])(
    'should resolve %s when %s',
    (expected, _context, resource, platforms, requiredProductVersion) => {
      // Given / When
      const eligibility = resolveDeployEligibility({
        resource,
        platforms,
        requiredProductVersion,
      });

      // Then
      expect(eligibility).toBe(expected);
    }
  );
});
