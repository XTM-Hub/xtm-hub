import { getRegisteredPlatformBreadcrumbs } from '@/components/service/registration/registered-platform-overview.utils';

const PLATFORM_TITLE = 'My OpenCTI';

describe('getRegisteredPlatformBreadcrumbs', () => {
  it('should lead back to the CSM board when the platform page is opened from it', () => {
    // Given a platform page opened from the CSM board
    // When its breadcrumbs are built
    const breadcrumbs = getRegisteredPlatformBreadcrumbs({
      platformTitle: PLATFORM_TITLE,
      isFromCsmBoard: true,
    });

    // Then they go through the settings and the CSM board to the platform
    expect(breadcrumbs).toEqual([
      { label: 'MenuLinks.Settings' },
      { label: 'MenuLinks.CSMBoard', href: '/app/admin/csm-board' },
      { label: PLATFORM_TITLE, original: true },
    ]);
  });

  it('should lead back to the home when the platform page is not opened from the CSM board', () => {
    // Given a platform page opened by a customer
    // When its breadcrumbs are built
    const breadcrumbs = getRegisteredPlatformBreadcrumbs({
      platformTitle: PLATFORM_TITLE,
      isFromCsmBoard: false,
    });

    // Then they go from the home to the platform
    expect(breadcrumbs).toEqual([
      { label: 'MenuLinks.Home', href: '/app' },
      { label: PLATFORM_TITLE, original: true },
    ]);
  });
});
