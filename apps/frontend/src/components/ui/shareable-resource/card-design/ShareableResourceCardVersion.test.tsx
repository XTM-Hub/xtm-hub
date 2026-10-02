import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  ShareableResourceCardVersion,
  VersionBadgeStatus,
} from './ShareableResourceCardVersion';

const CONNECTOR_VERSION = '6.8.13';
const TOOLTIP = 'Compatible with OpenCTI 1';

vi.mock('@filigran/ui/clients', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
}));

// Badge wraps its content in an inner div, so the badge itself is its parent.
const getBadge = () => screen.getByText(CONNECTOR_VERSION).parentElement;

describe('ShareableResourceCardVersion', () => {
  it('renders nothing without a version', () => {
    const { container } = testRender(
      <ShareableResourceCardVersion version={null} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it.each`
    description  | status       | expectedClass
    ${'success'} | ${'success'} | ${'text-alert-success-primary'}
    ${'warning'} | ${'warning'} | ${'text-alert-warning-primary'}
    ${'error'}   | ${'error'}   | ${'text-alert-error-primary'}
  `(
    'colours the badge for the $description status',
    ({
      status,
      expectedClass,
    }: {
      status: VersionBadgeStatus;
      expectedClass: string;
    }) => {
      testRender(
        <ShareableResourceCardVersion
          version={CONNECTOR_VERSION}
          status={status}
          tooltip={TOOLTIP}
        />
      );

      const badge = getBadge();

      expect(badge).toHaveClass(expectedClass);
      // Without this the inner div keeps text-foreground and the version
      // itself stays neutral whatever the status.
      expect(badge).toHaveClass('[&>div]:text-inherit');
    }
  );

  it('shows the tooltip and makes the badge focusable when one is given', () => {
    testRender(
      <ShareableResourceCardVersion
        version={CONNECTOR_VERSION}
        status="success"
        tooltip={TOOLTIP}
      />
    );

    expect(screen.getByText(TOOLTIP)).toBeInTheDocument();
    expect(getBadge()).toHaveAttribute('tabindex', '0');
  });

  it('renders a neutral badge without tooltip nor tab stop by default', () => {
    testRender(<ShareableResourceCardVersion version={CONNECTOR_VERSION} />);

    const badge = getBadge();

    expect(badge).toHaveTextContent(CONNECTOR_VERSION);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(badge).not.toHaveAttribute('tabindex');
    expect(badge?.className).not.toMatch(/text-alert-/);
    // The chip keeps the Badge tint; the outline variant would clear it.
    expect(badge).not.toHaveClass('bg-transparent');
  });
});
