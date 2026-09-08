import { isFeatureEnabled } from '@/utils/settings.service';
import Page from '@app/(application)/app/(user)/service/xtm-platform-trial/[serviceInstanceId]/manage-users/page';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/settings.service', () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock('@/components/AdminGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-guard">{children}</div>
  ),
}));

const clientSectionProps = vi.hoisted(() => vi.fn());
vi.mock(
  '@app/(application)/app/(user)/service/xtm-platform-trial/[serviceInstanceId]/manage-users/client-section',
  () => ({
    default: (props: { fromDashboard: boolean }) => {
      clientSectionProps(props);
      return (
        <div data-testid="client-section">{String(props.fromDashboard)}</div>
      );
    },
  })
);

const renderPage = async (from?: string) => {
  const element = await Page({
    params: Promise.resolve({ serviceInstanceId: 'bundle-1' }),
    searchParams: Promise.resolve(from ? { from } : {}),
  });
  render(element);
};

describe('manage-users page', () => {
  beforeEach(() => {
    vi.mocked(isFeatureEnabled).mockReset();
    vi.mocked(notFound).mockClear();
    clientSectionProps.mockReset();
  });

  it('calls notFound when the XtmPlatformTrial feature flag is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    await Page({
      params: Promise.resolve({ serviceInstanceId: 'bundle-1' }),
      searchParams: Promise.resolve({}),
    });

    expect(notFound).toHaveBeenCalled();
  });

  it('flags fromDashboard when opened from the admin dashboard', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    await renderPage('dashboard');

    expect(screen.getByTestId('client-section')).toHaveTextContent('true');
    expect(clientSectionProps).toHaveBeenCalledWith(
      expect.objectContaining({ fromDashboard: true })
    );
  });

  it('flags fromDashboard when the origin param is provided as an array', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    const element = await Page({
      params: Promise.resolve({ serviceInstanceId: 'bundle-1' }),
      searchParams: Promise.resolve({ from: ['dashboard', 'other'] }),
    });
    render(element);

    expect(clientSectionProps).toHaveBeenCalledWith(
      expect.objectContaining({ fromDashboard: true })
    );
  });

  it('does not flag fromDashboard for the default trial flow', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    await renderPage();

    expect(screen.getByTestId('client-section')).toHaveTextContent('false');
    expect(clientSectionProps).toHaveBeenCalledWith(
      expect.objectContaining({ fromDashboard: false })
    );
  });
});
