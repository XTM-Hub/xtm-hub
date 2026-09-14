import { loadCurrentUser } from '@/utils/load-me-user';
import { isFeatureEnabled } from '@/utils/settings.service';
import Page, {
  generateMetadata,
} from '@app/(public)/[locale]/cybersecurity-solutions/xtm-platform-trial/page';
import { render, screen } from '@testing-library/react';
import { notFound, redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/load-me-user', () => ({
  loadCurrentUser: vi.fn(),
}));

vi.mock('@/utils/settings.service', () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => Object.assign((key: string) => key, {}),
}));

vi.mock('@/utils/generate-metadata', () => ({
  buildFiligranOrganizationJsonLd: vi.fn(() => ({ '@type': 'Organization' })),
  buildSeoPageMetadata: vi.fn((options: { title: string }) => ({
    title: options.title,
  })),
  getBaseUrl: vi.fn(async () => 'https://hub.filigran.io'),
  stringifyJsonLd: vi.fn(() => '{}'),
}));

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/PublicXtmPlatformTrialPanel',
  () => ({
    PublicXtmPlatformTrialPanel: () => <div data-testid="public-panel" />,
  })
);

describe('public xtm-platform-trial page', () => {
  beforeEach(() => {
    vi.mocked(loadCurrentUser).mockReset();
    vi.mocked(redirect).mockReset();
    vi.mocked(notFound).mockClear();
    vi.mocked(isFeatureEnabled).mockReset().mockResolvedValue(true);
  });

  it('redirects logged-in users to the private xtm-platform-trial page', async () => {
    vi.mocked(loadCurrentUser).mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<typeof loadCurrentUser>>);

    await Page({ params: Promise.resolve({ locale: 'en' }) });

    expect(redirect).toHaveBeenCalledWith('/app/service/xtm-platform-trial');
  });

  it('renders the breadcrumb and page for anonymous users', async () => {
    vi.mocked(loadCurrentUser).mockResolvedValue(null);

    const element = await Page({ params: Promise.resolve({ locale: 'en' }) });
    render(element);

    expect(screen.getByTestId('public-panel')).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Breadcrumb')
    ).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('calls notFound when the XtmPlatformTrial feature flag is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    await Page({ params: Promise.resolve({ locale: 'en' }) });

    expect(notFound).toHaveBeenCalled();
  });

  it('builds the SEO metadata for the page', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    });

    expect(metadata.title).toContain('Service.Trials.XtmPlatform.Page.Title');
  });
});
