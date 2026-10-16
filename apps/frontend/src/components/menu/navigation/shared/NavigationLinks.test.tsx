import {
  NavigationLinkMenu,
  PublicSubLink,
} from '@/components/menu/navigation/shared/NavigationLinks';
import testRender from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const LINK_HREF = '/en/link';
const LABEL = 'Tableaux de bord personnalisés';
const TestIcon = () => <svg />;

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
        highlight
      />
    );

    // Then
    expect(screen.getByText('Highlighted')).toHaveClass('text-gradient-focus');
    expect(screen.getByRole('link', { name: 'Highlighted' })).not.toHaveClass(
      'text-gradient-focus'
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
