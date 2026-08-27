import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const translate = vi.fn((key: string) => key);
const getTranslations = vi.hoisted(() => vi.fn());

vi.mock('next-intl/server', () => ({
  getTranslations,
}));

import ThreadConferenceBanner from './ThreadConferenceBanner';

describe('ThreadConferenceBanner', () => {
  beforeEach(() => {
    getTranslations.mockResolvedValue(translate);
    translate.mockClear();
  });

  it('should render a responsive conference image link when the homepage banner is displayed', async () => {
    // Given the homepage translation namespace is available
    // When the conference banner is rendered
    render(await ThreadConferenceBanner());

    // Then the supplied banner artwork links to the conference website
    const bannerLink = screen.getByRole('link', {
      name: 'Cta',
    });
    const bannerImage = screen.getByRole('img', {
      name: 'ImageAlt',
    });

    expect(bannerLink).toHaveAttribute('href', 'https://thread.filigran.io/');
    expect(bannerImage).toHaveAttribute(
      'src',
      '/thread-conference-banner.png'
    );
  });
});
