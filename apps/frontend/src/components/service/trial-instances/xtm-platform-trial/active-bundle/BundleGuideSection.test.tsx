import { BundleGuideSection } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleGuideSection';
import { XTM_PLATFORM_TRIAL_GUIDE_PATH } from '@/utils/path/constant';
import { expectPaperWithTitleAbove } from '@/utils/test/paper';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

const SEE_MORE_LABEL = 'XtmPlatformTrial.Guide.SeeMore';

describe('BundleGuideSection', () => {
  it('should link the see more button to the XTM Platform trial guide', () => {
    // Given
    vi.mocked(useTranslations).mockImplementation(
      (namespace) => (key) => `${namespace}.${key}`
    );

    // When
    testRender(<BundleGuideSection />);

    // Then
    expect(screen.getByRole('link', { name: SEE_MORE_LABEL })).toHaveAttribute(
      'href',
      XTM_PLATFORM_TRIAL_GUIDE_PATH
    );
  });

  it('should render the guide on the design system Paper surface, with the title above it', () => {
    // Given
    vi.mocked(useTranslations).mockImplementation(
      (namespace) => (key) => `${namespace}.${key}`
    );

    // When
    testRender(<BundleGuideSection />);

    // Then
    const title = screen.getByRole('heading', {
      level: 2,
      name: 'XtmPlatformTrial.Guide.Title',
    });
    const surface = screen
      .getByText('XtmPlatformTrial.Guide.Content')
      .closest('section');
    expectPaperWithTitleAbove(surface, title);
  });
});
