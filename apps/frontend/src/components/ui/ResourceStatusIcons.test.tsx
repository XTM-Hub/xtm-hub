import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResourceStatusIcons } from './ResourceStatusIcons';

vi.mock('@filigran/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/design-system')>()),
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('ResourceStatusIcons', () => {
  describe('when no status props are provided', () => {
    it('renders nothing when called with no props', () => {
      const { container } = testRender(<ResourceStatusIcons />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when all props are explicitly false', () => {
      const { container } = testRender(
        <ResourceStatusIcons
          active={false}
          verified={false}
          deployable={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when verified is true but displayUnverifiedIcon is false', () => {
    it('renders nothing', () => {
      const { container } = testRender(<ResourceStatusIcons verified />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when deployable is true', () => {
    it('renders one icon', () => {
      const { container } = testRender(<ResourceStatusIcons deployable />);
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    it('shows the "Automatic deploy" tooltip label', () => {
      testRender(<ResourceStatusIcons deployable />);
      expect(screen.getByText('Utils.AutomaticDeploy')).toBeInTheDocument();
    });
  });

  describe('when verified is true for a connector', () => {
    it('renders one icon', () => {
      const { container } = testRender(
        <ResourceStatusIcons
          verified
          displayUnverifiedIcon
        />
      );
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    it('shows the "Supported by Filigran" tooltip label', () => {
      testRender(
        <ResourceStatusIcons
          verified
          displayUnverifiedIcon
        />
      );
      expect(
        screen.getByText(
          'Service.ShareableResources.Details.SupportedByFiligran'
        )
      ).toBeInTheDocument();
    });
  });

  describe('when connector is true and verified is false', () => {
    it('renders one icon', () => {
      const { container } = testRender(
        <ResourceStatusIcons displayUnverifiedIcon />
      );
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    it('shows the "Supported by Community" tooltip label', () => {
      testRender(<ResourceStatusIcons displayUnverifiedIcon />);
      expect(
        screen.getByText(
          'Service.ShareableResources.Details.SupportedByCommunity'
        )
      ).toBeInTheDocument();
    });
  });

  describe('when active is true', () => {
    it('renders one icon', () => {
      const { container } = testRender(<ResourceStatusIcons active />);
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    it('shows the "Published" tooltip label', () => {
      testRender(<ResourceStatusIcons active />);
      expect(screen.getByText('Badge.Published')).toBeInTheDocument();
    });
  });

  describe('when multiple props are true', () => {
    it.each`
      active   | verified | deployable | isConnector | expectedIconCount
      ${true}  | ${true}  | ${false}   | ${true}     | ${2}
      ${true}  | ${false} | ${true}    | ${true}     | ${3}
      ${false} | ${false} | ${true}    | ${true}     | ${2}
      ${false} | ${false} | ${false}   | ${true}     | ${1}
      ${true}  | ${true}  | ${true}    | ${true}     | ${3}
    `(
      'renders $expectedIconCount icon(s) for active=$active verified=$verified deployable=$deployable isConnector=$isConnector',
      ({ active, verified, deployable, isConnector, expectedIconCount }) => {
        const { container } = testRender(
          <ResourceStatusIcons
            active={active}
            verified={verified}
            deployable={deployable}
            displayUnverifiedIcon={isConnector}
          />
        );
        expect(container.querySelectorAll('svg')).toHaveLength(
          expectedIconCount
        );
      }
    );
  });

  describe('with a custom iconClassName', () => {
    it('applies the custom class to the rendered icon', () => {
      const { container } = testRender(
        <ResourceStatusIcons
          active
          iconClassName="custom-icon-class"
        />
      );
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('custom-icon-class');
    });

    it('does not apply the default class when a custom one is provided', () => {
      const { container } = testRender(
        <ResourceStatusIcons
          active
          iconClassName="custom-icon-class"
        />
      );
      const icon = container.querySelector('svg');
      expect(icon).not.toHaveClass('text-alert-success-primary');
    });
  });
});
