import { BundleGuideCard } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleGuideCard';
import { XTM_PLATFORM_TRIAL_GUIDE_PATH } from '@/utils/path/constant';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

const SEE_MORE_LABEL = 'XtmPlatformTrial.Guide.SeeMore';

describe('BundleGuideCard', () => {
  it('should link the see more button to the XTM Platform trial guide', () => {
    // Given
    vi.mocked(useTranslations).mockImplementation(
      (namespace) => (key) => `${namespace}.${key}`
    );

    // When
    testRender(<BundleGuideCard />);

    // Then
    expect(screen.getByRole('link', { name: SEE_MORE_LABEL })).toHaveAttribute(
      'href',
      XTM_PLATFORM_TRIAL_GUIDE_PATH
    );
  });
});
