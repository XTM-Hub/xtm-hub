import { fetchSeoServiceInstanceBySlug } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import Page from '@app/(public)/[locale]/cybersecurity-solutions/xtm-platform-roadmap/feature-voting/page';
import { render, screen } from '@testing-library/react';
import { notFound, redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOT_FOUND_SENTINEL = new Error('NEXT_NOT_FOUND');

vi.mock(
  '@/utils/seo-service-instance/utils/seo-service-instance.server.utils',
  () => ({
    fetchSeoServiceInstanceBySlug: vi.fn(async () => ({ id: 'instance-1' })),
  })
);

vi.mock('next-intl/server', () => ({
  getTranslations: async () => Object.assign((key: string) => key, {}),
  setRequestLocale: vi.fn(),
}));

vi.mock('@/utils/generate-metadata', () => ({
  buildSeoPageMetadata: vi.fn((options: { title: string }) => ({
    title: options.title,
  })),
  getBaseUrl: vi.fn(async () => 'https://hub.filigran.io'),
}));

vi.mock('@/components/feature-voting/PrefetchedFeatureVotingList', () => ({
  PrefetchedFeatureVotingList: () => <div data-testid="feature-voting-list" />,
}));

describe('public feature-voting page', () => {
  beforeEach(() => {
    vi.mocked(redirect).mockReset();
  });

  it('should render the public list without redirecting, signed in or not', async () => {
    // When
    const element = await Page({ params: Promise.resolve({ locale: 'en' }) });
    render(element);

    // Then
    expect(screen.getByTestId('feature-voting-list')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('should render the not found page when the roadmap service instance does not exist', async () => {
    // Given
    vi.mocked(fetchSeoServiceInstanceBySlug).mockResolvedValueOnce(null);
    // Next.js' notFound never returns: it throws to interrupt the render.
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw NOT_FOUND_SENTINEL;
    });

    // When
    const result = Page({ params: Promise.resolve({ locale: 'en' }) });

    // Then
    await expect(result).rejects.toBe(NOT_FOUND_SENTINEL);
  });
});
