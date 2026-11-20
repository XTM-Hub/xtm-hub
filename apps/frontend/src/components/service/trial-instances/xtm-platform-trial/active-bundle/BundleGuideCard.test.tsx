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

  it('should render the guide on the design system Paper surface, with the title above it', () => {
    // Given
    vi.mocked(useTranslations).mockImplementation(
      (namespace) => (key) => `${namespace}.${key}`
    );

    // When
    testRender(<BundleGuideCard />);

    // Then
    const title = screen.getByRole('heading', {
      level: 2,
      name: 'XtmPlatformTrial.Guide.Title',
    });
    const surface = screen
      .getByText('XtmPlatformTrial.Guide.Content')
      .closest('section');
    // The surface carries the design system radius, padding and elevation
    // classes. These pin the design system's class names on purpose, as jsdom
    // does no layout: a rename in the design system needs this test updated.
    // The elevation is the default one, shared with the other blocks of the page.
    expect(surface).toHaveClass('rounded-sm', 'p-4', 'layer-1');
    expect(surface).not.toContainElement(title);
    expect(surface?.parentElement).toContainElement(title);
  });
});
