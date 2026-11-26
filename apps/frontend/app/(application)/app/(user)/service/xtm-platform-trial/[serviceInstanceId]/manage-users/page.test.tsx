import Page from '@app/(application)/app/(user)/service/xtm-platform-trial/[serviceInstanceId]/manage-users/page';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    clientSectionProps.mockReset();
  });

  it('flags fromDashboard when opened from the admin dashboard', async () => {
    await renderPage('dashboard');

    expect(screen.getByTestId('client-section')).toHaveTextContent('true');
    expect(clientSectionProps).toHaveBeenCalledWith(
      expect.objectContaining({ fromDashboard: true })
    );
  });

  it('flags fromDashboard when the origin param is provided as an array', async () => {
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
    await renderPage();

    expect(screen.getByTestId('client-section')).toHaveTextContent('false');
    expect(clientSectionProps).toHaveBeenCalledWith(
      expect.objectContaining({ fromDashboard: false })
    );
  });
});
