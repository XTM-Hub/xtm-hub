import {
  NavigationLinkMenu,
  PublicSubLink,
} from '@/components/menu/navigation/shared/NavigationLinks';
import {
  NAVIGATION_ACTIVE_CLASSES,
  NAVIGATION_SUBMENU_ACTIVE_CLASSES,
} from '@/components/menu/navigation/shared/navigation-styles';
import testRender from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const LINK_HREF = '/en/link';
const ANALYTICS_ID = 'nav_blog_open';
const LABEL = 'Tableaux de bord personnalisés';
const TestIcon = () => <svg />;

const ROADMAP_HREF =
  '/app/service/xtm_platform_roadmap/U2VydmljZUluc3RhbmNlOjEyMw==';
const ROADMAP_ENCODED_PATH =
  '/app/service/xtm_platform_roadmap/U2VydmljZUluc3RhbmNlOjEyMw%3D%3D';
const ROADMAP_SUBPAGE_PATH = `${ROADMAP_HREF}/feature-voting`;
const ACTIVE_PATHS: [string, string][] = [
  ['the raw path', ROADMAP_HREF],
  ['the encoded path', ROADMAP_ENCODED_PATH],
  ['a subpage', ROADMAP_SUBPAGE_PATH],
];
const ACTIVE_CLASSES = NAVIGATION_ACTIVE_CLASSES.split(' ');
const SUBMENU_ACTIVE_CLASSES = NAVIGATION_SUBMENU_ACTIVE_CLASSES.split(' ');

const LABEL_BOX_WIDTH = 100;
const FITTING_LABEL_WIDTH = LABEL_BOX_WIDTH;
const TRUNCATED_LABEL_WIDTH = LABEL_BOX_WIDTH + 1;

type Interaction = (user: UserEvent, link: HTMLElement) => Promise<void>;

const INTERACTIONS: [string, Interaction][] = [
  ['hovered', (user, link) => user.hover(link)],
  ['focused', (user) => user.tab()],
];

const mockLabelWidth = (labelWidth: number) => {
  const label = screen.getByText(LABEL);
  Object.defineProperty(label, 'scrollWidth', { value: labelWidth });
  Object.defineProperty(label, 'clientWidth', { value: LABEL_BOX_WIDTH });
};

const interactWithLink = async (interaction: Interaction) => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await interaction(user, screen.getByRole('link', { name: LABEL }));
  act(() => vi.runOnlyPendingTimers());
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PublicSubLink', () => {
  it('paints the gradient on the label of a highlighted, inactive link, not on the link itself', () => {
    // Given
    vi.mocked(usePathname).mockReturnValue('/en');

    // When
    testRender(
      <PublicSubLink
        href="/en/highlighted"
        label="Highlighted"
        analyticsId={ANALYTICS_ID}
        highlight
      />
    );

    // Then
    expect(screen.getByText('Highlighted')).toHaveClass('text-gradient-focus');
    expect(screen.getByRole('link', { name: 'Highlighted' })).not.toHaveClass(
      'text-gradient-focus'
    );
  });

  it.each(ACTIVE_PATHS)(
    'should be selected when the current path is %s',
    (_name, currentPath) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(currentPath);

      // When
      testRender(
        <PublicSubLink
          href={ROADMAP_HREF}
          label={LABEL}
          analyticsId={ANALYTICS_ID}
        />
      );

      // Then
      expect(screen.getByRole('link', { name: LABEL })).toHaveClass(
        ...SUBMENU_ACTIVE_CLASSES
      );
    }
  );

  it('should not be selected when the current path is a sibling page', () => {
    // Given
    vi.mocked(usePathname).mockReturnValue(`${ROADMAP_HREF}2`);

    // When
    testRender(
      <PublicSubLink
        href={ROADMAP_HREF}
        label={LABEL}
        analyticsId={ANALYTICS_ID}
      />
    );

    // Then
    expect(screen.getByRole('link', { name: LABEL })).not.toHaveClass(
      ...SUBMENU_ACTIVE_CLASSES
    );
  });

  it.each(INTERACTIONS)(
    'should show the full label in a tooltip when the link is %s and the label is truncated',
    async (_interactionName, interaction) => {
      // Given
      testRender(
        <PublicSubLink
          href={LINK_HREF}
          label={LABEL}
          analyticsId={ANALYTICS_ID}
        />
      );
      mockLabelWidth(TRUNCATED_LABEL_WIDTH);

      // When
      await interactWithLink(interaction);

      // Then
      expect(screen.getByRole('tooltip')).toHaveTextContent(LABEL);
    }
  );

  it.each(INTERACTIONS)(
    'should show no tooltip when the link is %s and the label fits',
    async (_interactionName, interaction) => {
      // Given
      testRender(
        <PublicSubLink
          href={LINK_HREF}
          label={LABEL}
          analyticsId={ANALYTICS_ID}
        />
      );
      mockLabelWidth(FITTING_LABEL_WIDTH);

      // When
      await interactWithLink(interaction);

      // Then
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    }
  );
});

describe('NavigationLinkMenu', () => {
  it.each(ACTIVE_PATHS)(
    'should be selected when the current path is %s',
    (_name, currentPath) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(currentPath);

      // When
      testRender(
        <NavigationLinkMenu
          open
          href={ROADMAP_HREF}
          icon={TestIcon}
          text={LABEL}
          analyticsId={ANALYTICS_ID}
        />
      );

      // Then
      expect(screen.getByRole('link', { name: LABEL })).toHaveClass(
        ...ACTIVE_CLASSES
      );
    }
  );

  it('should not be selected when the current path is another page', () => {
    // Given
    vi.mocked(usePathname).mockReturnValue('/app/service/other/abc');

    // When
    testRender(
      <NavigationLinkMenu
        open
        href={ROADMAP_HREF}
        icon={TestIcon}
        text={LABEL}
        analyticsId={ANALYTICS_ID}
      />
    );

    // Then
    expect(screen.getByRole('link', { name: LABEL })).not.toHaveClass(
      ...ACTIVE_CLASSES
    );
  });

  it.each(INTERACTIONS)(
    'should show the full label in a tooltip when the link is %s and the label is truncated in the opened menu',
    async (_interactionName, interaction) => {
      // Given
      testRender(
        <NavigationLinkMenu
          open
          href={LINK_HREF}
          icon={TestIcon}
          text={LABEL}
          analyticsId={ANALYTICS_ID}
        />
      );
      mockLabelWidth(TRUNCATED_LABEL_WIDTH);

      // When
      await interactWithLink(interaction);

      // Then
      expect(screen.getByRole('tooltip')).toHaveTextContent(LABEL);
    }
  );

  it.each(INTERACTIONS)(
    'should show no tooltip when the link is %s in the collapsed menu',
    async (_interactionName, interaction) => {
      // Given
      testRender(
        <NavigationLinkMenu
          open={false}
          href={LINK_HREF}
          icon={TestIcon}
          text={LABEL}
          analyticsId={ANALYTICS_ID}
        />
      );
      mockLabelWidth(TRUNCATED_LABEL_WIDTH);

      // When
      await interactWithLink(interaction);

      // Then
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    }
  );
});
