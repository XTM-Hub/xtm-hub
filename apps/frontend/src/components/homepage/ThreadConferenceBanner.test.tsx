import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThreadConferenceBanner from './ThreadConferenceBanner';

const { mockGetTranslations, mockTranslate } = vi.hoisted(() => ({
  mockGetTranslations: vi.fn(),
  mockTranslate: vi.fn((key: string) => key),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: mockGetTranslations,
}));

describe('ThreadConferenceBanner', () => {
  beforeEach(() => {
    mockGetTranslations.mockReset();
    mockTranslate.mockClear();
    mockGetTranslations.mockResolvedValue(mockTranslate);
  });

  it('should render a responsive conference image link when the homepage banner is displayed', async () => {
    // Given the homepage translation namespace is available
    // When the conference banner is rendered
    render(await ThreadConferenceBanner());

    // Then the supplied banner artwork links to the conference website
    const bannerLink = screen.getByRole('link', {
      name: 'ThreadConference.AriaLabel',
    });
    const threadLogo = screen.getByRole('img', {
      name: 'XTM Hub logo',
    });
    const conferenceDate = screen.getByText('ThreadConference.Date');
    const conferenceCta = screen.getByText('ThreadConference.Cta');
    const dateDot = conferenceDate.querySelector('span');

    expect(bannerLink).toHaveAttribute(
      'href',
      'https://filigran.io/thread?form_origin=xtmhub'
    );
    expect(threadLogo).toHaveAttribute('src', '/thread-logo.svg');
    expect(conferenceDate).toHaveClass('inline-flex', 'w-fit', 'rounded-full');
    expect(conferenceCta).toHaveClass(
      'flex',
      'w-full',
      'justify-center',
      'whitespace-nowrap',
      'rounded-full',
      'sm:w-fit'
    );
    expect(dateDot).toHaveClass('h-2', 'w-2', 'rounded-full', 'bg-blue');
    expect(threadLogo.closest('a')).toBe(bannerLink);
  });
});
