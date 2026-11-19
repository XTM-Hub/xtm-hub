import { DeployableResourceViewTracker } from '@/components/service/document/DeployableResourceViewTracker';
import {
  RegisteredPlatformsListItem,
  useRegisteredPlatforms,
} from '@/hooks/use-registered-platforms';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const RESOURCE = {
  id: '9c81d7e6-1a2b-4c3d-9e8f-7a6b5c4d3e2f',
  name: 'Ransomware dashboard',
  type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
  use_cases: [],
};

const PLATFORM = {
  id: 'platform-id',
  title: 'Production OpenCTI',
  url: 'https://opencti.acme.com',
  version: '6.4.0',
  contract: 'EE',
} as RegisteredPlatformsListItem;

beforeEach(() => {
  startAnalytics();
});

describe('DeployableResourceViewTracker', () => {
  it('should not send the view while the platforms are loading', () => {
    // Given
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [],
      isPending: true,
    });

    // When
    testRender(<DeployableResourceViewTracker resource={RESOURCE} />);

    // Then
    expect(readTrackedEvents('view_item')).toEqual([]);
  });

  it.each([
    ['Can deploy', 'a platform is connected', [PLATFORM]],
    ['No platform connected', 'no platform is connected', []],
  ])(
    'should send the view as "%s" once the platforms are loaded and %s',
    (deployEligibility, _context, platforms) => {
      // Given
      vi.mocked(useRegisteredPlatforms).mockReturnValue({
        platforms,
        isPending: false,
      });

      // When
      testRender(<DeployableResourceViewTracker resource={RESOURCE} />);

      // Then
      expect(useRegisteredPlatforms).toHaveBeenCalledWith('opencti', {
        onlyActive: true,
      });
      expect(readTrackedEvents('view_item')).toEqual([
        expect.objectContaining({ deploy_eligibility: deployEligibility }),
      ]);
    }
  );
});
