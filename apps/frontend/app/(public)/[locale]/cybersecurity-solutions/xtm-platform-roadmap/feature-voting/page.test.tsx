import { loadCurrentUser } from '@/utils/load-me-user';
import Page from '@app/(public)/[locale]/cybersecurity-solutions/xtm-platform-roadmap/feature-voting/page';
import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const APP_FEATURE_VOTING_HREF =
  '/app/service/xtm_platform_roadmap/instance-1/feature-voting';

vi.mock('@/utils/load-me-user', () => ({
  loadCurrentUser: vi.fn(),
}));

vi.mock('@/relay/server-portal-api-fetch', () => ({
  serverFetchGraphQL: vi.fn(async () => ({
    data: { seoServiceInstance: { id: 'instance-1' } },
  })),
}));

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

vi.mock('@/components/feature-voting/FeatureVotingList', () => ({
  FeatureVotingList: () => <div data-testid="feature-voting-list" />,
}));

describe('public feature-voting page', () => {
  beforeEach(() => {
    vi.mocked(loadCurrentUser).mockReset();
    vi.mocked(redirect).mockReset();
  });

  it('redirects logged-in users to the private in-app voting page', async () => {
    vi.mocked(loadCurrentUser).mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<typeof loadCurrentUser>>);

    await Page({ params: Promise.resolve({ locale: 'en' }) });

    expect(redirect).toHaveBeenCalledWith(APP_FEATURE_VOTING_HREF);
  });

  it('renders the public list for anonymous users', async () => {
    vi.mocked(loadCurrentUser).mockResolvedValue(null);

    const element = await Page({ params: Promise.resolve({ locale: 'en' }) });
    render(element);

    expect(screen.getByTestId('feature-voting-list')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});
