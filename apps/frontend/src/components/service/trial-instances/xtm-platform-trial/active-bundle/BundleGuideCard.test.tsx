import { BundleGuideCard } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleGuideCard';
import { XTM_PLATFORM_TRIAL_GUIDE_PATH } from '@/utils/path/constant';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('BundleGuideCard', () => {
  it('should link to the XTM Platform trial guide when the card is displayed', () => {
    // Given / When
    testRender(<BundleGuideCard />);

    // Then
    expect(screen.getByRole('link', { name: 'SeeMore' })).toHaveAttribute(
      'href',
      XTM_PLATFORM_TRIAL_GUIDE_PATH
    );
  });
});
