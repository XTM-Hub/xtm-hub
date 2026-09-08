import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import PublicNavigation from './PublicNavigation';

const ALL_SERVICE_SLUGS = [
  'opencti-custom-dashboards',
  'opencti-custom-views',
  'opencti-integrations',
  'opencti-playbooks',
  'openaev-scenarios',
  'xtm-platform-roadmap',
];

const renderPublicNavigation = (
  isXtmPlatformTrialEnabled: boolean,
  open = true,
  visibleServiceSlugs = ALL_SERVICE_SLUGS
) =>
  testRender(
    <PublicNavigation
      open={open}
      visibleServiceSlugs={visibleServiceSlugs}
      isXtmPlatformTrialEnabled={isXtmPlatformTrialEnabled}
    />
  );

const expandSection = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string
) => {
  const trigger = screen.getByRole('button', { name });
  await user.click(trigger);
  await waitFor(() => {
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
  return trigger;
};

describe('PublicNavigation — open={true}', () => {
  it('renders all section labels in the accordion', () => {
    renderPublicNavigation(true);

    expect(screen.getByText('Menu.XTMPlatform')).toBeInTheDocument();
    // Hardcoded labels
    expect(screen.getByText('OpenCTI')).toBeInTheDocument();
    expect(screen.getByText('OpenAEV')).toBeInTheDocument();
    expect(screen.getByText('XTM One')).toBeInTheDocument();
  });

  it('renders bottom links with their labels', () => {
    renderPublicNavigation(true);

    expect(screen.getByText('Menu.XTMRoadmap')).toBeInTheDocument();
    expect(screen.getByText('Menu.FiligranAcademy')).toBeInTheDocument();
    expect(screen.getByText('Menu.Blog')).toBeInTheDocument();
    expect(screen.getByText('Menu.Slack')).toBeInTheDocument();
    expect(screen.getByText('Menu.XTMPlatformTrial')).toBeInTheDocument();
  });

  it('XTM Platform renders as a link, not an accordion trigger', () => {
    renderPublicNavigation(true);

    // LinkedSection renders a plain <a> (via next/link), not a button with aria-expanded
    const xtmPlatformLink = screen.getByRole('link', {
      name: /^Menu\.XTMPlatform$/,
    });
    expect(xtmPlatformLink).toBeInTheDocument();
    expect(xtmPlatformLink).not.toHaveAttribute('aria-expanded');
  });

  it('expanding the OpenCTI accordion shows its sub-links', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true);

    await expandSection(user, 'OpenCTI');

    expect(screen.getByText('Menu.CustomDashboards')).toBeInTheDocument();
    expect(screen.getByText('Menu.Integrations')).toBeInTheDocument();
    expect(screen.getByText('Menu.LiveDemo')).toBeInTheDocument();
    expect(screen.getByText('Menu.Documentation')).toBeInTheDocument();
  });

  it('expanding the OpenAEV accordion shows its sub-links', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true);

    await expandSection(user, 'OpenAEV');

    expect(screen.getByText('Menu.Scenarios')).toBeInTheDocument();
  });

  it('expanding XTM One accordion shows the badge-only AI Catalog entry', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true);

    await expandSection(user, 'XTM One');

    expect(screen.getByText('Menu.AICatalog')).toBeInTheDocument();
    expect(screen.getByText('Menu.ComingSoon')).toBeInTheDocument();
  });

  it('external sub-links have target="_blank" and rel="noopener noreferrer"', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true);

    await expandSection(user, 'OpenCTI');

    const liveDemoLinks = screen.getAllByRole('link', {
      name: /Menu\.LiveDemo/,
    });
    // At least one "Live Demo" link should be external
    const externalLink = liveDemoLinks.find(
      (l) => l.getAttribute('target') === '_blank'
    );
    expect(externalLink).toBeDefined();
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('applies active styles to the link matching the current pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/en');
    renderPublicNavigation(true);

    const xtmPlatformLink = screen.getByRole('link', {
      name: /^Menu\.XTMPlatform$/,
    });
    // Active class contains bg-primary/10
    expect(xtmPlatformLink.className).toContain('bg-primary/10');
  });

  it('does not apply active styles to links that do not match the current pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/en');
    renderPublicNavigation(true);

    // The roadmap bottom link href is /en/cybersecurity-solutions/xtm-platform-roadmap
    // which does NOT equal /en
    const roadmapLink = screen.getByRole('link', {
      name: /Menu\.XTMRoadmap/,
    });
    expect(roadmapLink.className).not.toContain('bg-primary/10');
  });

  it('locale is injected into internal link hrefs', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true);

    await expandSection(user, 'OpenCTI');

    const dashboardsLink = screen.getByRole('link', {
      name: 'Menu.CustomDashboards',
    });
    expect(dashboardsLink).toHaveAttribute(
      'href',
      '/en/cybersecurity-solutions/opencti-custom-dashboards'
    );
  });

  it('XTM One badge-only entry renders without a link', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true);

    await expandSection(user, 'XTM One');

    const aiCatalogText = screen.getByText('Menu.AICatalog');
    // Rendered as a <span>, not a link
    expect(aiCatalogText.closest('a')).toBeNull();
  });

  it('omits service entries whose slug is not visible', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(
      true,
      true,
      ALL_SERVICE_SLUGS.filter(
        (slug) =>
          slug !== 'opencti-custom-views' && slug !== 'xtm-platform-roadmap'
      )
    );

    await expandSection(user, 'OpenCTI');

    expect(screen.queryByText('Menu.CustomViews')).not.toBeInTheDocument();
    expect(screen.queryByText('Menu.XTMRoadmap')).not.toBeInTheDocument();
    expect(screen.getByText('Menu.CustomDashboards')).toBeInTheDocument();
    expect(screen.getByText('Menu.Integrations')).toBeInTheDocument();
  });

  it('keeps non-service entries when no service is visible', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true, true, []);

    await expandSection(user, 'OpenCTI');

    expect(screen.getByText('Menu.Documentation')).toBeInTheDocument();
    expect(screen.getByText('Menu.FiligranAcademy')).toBeInTheDocument();
    expect(screen.queryByText('Menu.CustomDashboards')).not.toBeInTheDocument();
  });
});

describe('PublicNavigation — open={false}', () => {
  it('renders section buttons with aria-labels for accessibility', () => {
    renderPublicNavigation(true, false);

    expect(screen.getByRole('button', { name: 'OpenCTI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OpenAEV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'XTM One' })).toBeInTheDocument();
  });

  it('section labels are visually hidden (sr-only) in closed mode', () => {
    renderPublicNavigation(true, false);

    // Bottom links use PublicLinkMenu which renders the label with sr-only when closed
    const roadmapLabel = screen.getByText('Menu.XTMRoadmap');
    expect(roadmapLabel.className).toContain('sr-only');
  });

  it('XTM Platform renders as a link with aria-label in closed mode', () => {
    renderPublicNavigation(true, false);

    const xtmLink = screen.getByRole('link', {
      name: 'Menu.XTMPlatform',
    });
    expect(xtmLink).toBeInTheDocument();
  });

  it('hovering a closed section button opens the popover with sub-links', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true, false);

    const openctiButton = screen.getByRole('button', { name: 'OpenCTI' });
    await user.hover(openctiButton);

    await waitFor(() => {
      expect(screen.getByText('Menu.Documentation')).toBeInTheDocument();
    });
  });

  it('moving the mouse away from a closed section closes the popover', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true, false);

    const openctiButton = screen.getByRole('button', { name: 'OpenCTI' });
    await user.hover(openctiButton);

    await waitFor(() => {
      expect(screen.getByText('Menu.Documentation')).toBeInTheDocument();
    });

    await user.unhover(openctiButton);

    await waitFor(() => {
      expect(screen.queryByText('Menu.Documentation')).not.toBeInTheDocument();
    });
  });

  it('does not show product Start Free Trial entries in public navigation', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(true, false);

    const openctiButton = screen.getByRole('button', { name: 'OpenCTI' });
    await user.hover(openctiButton);

    await waitFor(() => {
      expect(screen.queryByText('Menu.StartFreeTrial')).not.toBeInTheDocument();
    });
  });

  it('shows product Start Free Trial entries when feature flag is off', async () => {
    const user = userEvent.setup();
    renderPublicNavigation(false, false);

    const openctiButton = screen.getByRole('button', { name: 'OpenCTI' });
    await user.hover(openctiButton);

    await waitFor(() => {
      expect(screen.getByText('Menu.StartFreeTrial')).toBeInTheDocument();
    });
  });

  it('should hide XTM Platform Trial bottom link when feature flag is off', () => {
    renderPublicNavigation(false, false);

    expect(screen.queryByText('Menu.XTMPlatformTrial')).not.toBeInTheDocument();
  });
});
