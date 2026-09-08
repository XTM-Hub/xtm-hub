import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { PublicMobileMenuButton } from './PublicMobileMenuButton';

vi.mock('@public/logo.svg', () => ({
  default: () => <svg data-testid="logo" />,
}));

vi.mock('@/components/menu/navigation/public/PublicNavigation', () => ({
  default: () => (
    <div data-testid="public-navigation">
      <Link href="/en/some-page">Some page</Link>
    </div>
  ),
}));

describe('PublicMobileMenuButton', () => {
  it('renders the trigger with a screen-reader label', () => {
    testRender(
      <PublicMobileMenuButton
        visibleServiceSlugs={[]}
        isXtmPlatformTrialEnabled={true}
      />
    );

    const srText = screen.getByText('Header.OpenMenu');
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass('sr-only');
  });

  it('renders the menu icon trigger', () => {
    testRender(
      <PublicMobileMenuButton
        visibleServiceSlugs={[]}
        isXtmPlatformTrialEnabled={true}
      />
    );

    // The SheetTrigger wraps the icon; the sr-only span makes it accessible
    expect(screen.getByText('Header.OpenMenu')).toBeInTheDocument();
  });

  it('opens the sheet and shows PublicNavigation when trigger is clicked', async () => {
    const user = userEvent.setup();
    testRender(
      <PublicMobileMenuButton
        visibleServiceSlugs={[]}
        isXtmPlatformTrialEnabled={true}
      />
    );

    expect(screen.queryByTestId('public-navigation')).not.toBeInTheDocument();

    await user.click(
      screen.getByText('Header.OpenMenu').closest('button') ??
        screen.getByText('Header.OpenMenu')
    );

    await waitFor(() => {
      expect(screen.getByTestId('public-navigation')).toBeInTheDocument();
    });
  });

  it('shows the brand name in the sheet header when open', async () => {
    const user = userEvent.setup();
    testRender(
      <PublicMobileMenuButton
        visibleServiceSlugs={[]}
        isXtmPlatformTrialEnabled={true}
      />
    );

    await user.click(
      screen.getByText('Header.OpenMenu').closest('button') ??
        screen.getByText('Header.OpenMenu')
    );

    await waitFor(() => {
      expect(screen.getByText('Header.BrandName')).toBeInTheDocument();
    });
  });

  it('closes the sheet when the pathname changes', async () => {
    const user = userEvent.setup();
    vi.mocked(usePathname).mockReturnValue('/en');

    const { rerender } = testRender(
      <PublicMobileMenuButton
        visibleServiceSlugs={[]}
        isXtmPlatformTrialEnabled={true}
      />
    );

    await user.click(
      screen.getByText('Header.OpenMenu').closest('button') ??
        screen.getByText('Header.OpenMenu')
    );

    await waitFor(() => {
      expect(screen.getByTestId('public-navigation')).toBeInTheDocument();
    });

    vi.mocked(usePathname).mockReturnValue('/en/new-path');
    rerender(
      <PublicMobileMenuButton
        visibleServiceSlugs={[]}
        isXtmPlatformTrialEnabled={true}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('public-navigation')).not.toBeInTheDocument();
    });
  });

  it('closes the sheet when a link inside the content is clicked', async () => {
    const user = userEvent.setup();
    testRender(
      <PublicMobileMenuButton
        visibleServiceSlugs={[]}
        isXtmPlatformTrialEnabled={true}
      />
    );

    await user.click(
      screen.getByText('Header.OpenMenu').closest('button') ??
        screen.getByText('Header.OpenMenu')
    );

    await waitFor(() => {
      expect(screen.getByTestId('public-navigation')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('link', { name: 'Some page' }));

    await waitFor(() => {
      expect(screen.queryByTestId('public-navigation')).not.toBeInTheDocument();
    });
  });
});
