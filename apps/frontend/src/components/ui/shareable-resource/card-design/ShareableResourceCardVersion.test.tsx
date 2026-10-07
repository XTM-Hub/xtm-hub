import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  ShareableResourceCardVersion,
  VersionBadgeStatus,
} from './ShareableResourceCardVersion';

const CONNECTOR_VERSION = '6.8.13';
const PREFIXED_VERSION = `V.${CONNECTOR_VERSION}`;
const TOOLTIP = 'Compatible with OpenCTI 1';

vi.mock('@filigran/ui/clients', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
}));

vi.mock('@filigran/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/design-system')>()),
  Icon: ({ name }: { name: string }) => <svg data-testid={`icon-${name}`} />,
}));

// Chip wraps its label in an inner span, so the chip itself is its parent.
const getChip = () => screen.getByText(PREFIXED_VERSION).parentElement;

describe('ShareableResourceCardVersion', () => {
  it('renders nothing without a version', () => {
    const { container } = testRender(
      <ShareableResourceCardVersion version={null} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('prefixes the version number', () => {
    testRender(<ShareableResourceCardVersion version={CONNECTOR_VERSION} />);

    expect(screen.getByText(PREFIXED_VERSION)).toBeInTheDocument();
  });

  it.each`
    description  | status       | expectedBackground                                 | expectedIcon
    ${'success'} | ${'success'} | ${'bg-feedback-success-secondary-transparency-30'} | ${'circle-check'}
    ${'warning'} | ${'warning'} | ${'bg-feedback-warning-secondary-transparency-30'} | ${'circle-alert'}
    ${'error'}   | ${'error'}   | ${'bg-feedback-error-secondary-transparency-30'}   | ${'circle-x'}
  `(
    'tints the chip and picks its icon for the $description status',
    ({
      status,
      expectedBackground,
      expectedIcon,
    }: {
      status: VersionBadgeStatus;
      expectedBackground: string;
      expectedIcon: string;
    }) => {
      testRender(
        <ShareableResourceCardVersion
          version={CONNECTOR_VERSION}
          status={status}
          tooltip={TOOLTIP}
        />
      );

      expect(getChip()).toHaveClass(expectedBackground);
      expect(screen.getByTestId(`icon-${expectedIcon}`)).toBeInTheDocument();
    }
  );

  it('shows the tooltip and makes the chip focusable when one is given', () => {
    testRender(
      <ShareableResourceCardVersion
        version={CONNECTOR_VERSION}
        status="success"
        tooltip={TOOLTIP}
      />
    );

    expect(screen.getByText(TOOLTIP)).toBeInTheDocument();
    expect(getChip()).toHaveAttribute('tabindex', '0');
  });

  it('renders a blue chip without icon, tooltip nor tab stop by default', () => {
    const { container } = testRender(
      <ShareableResourceCardVersion version={CONNECTOR_VERSION} />
    );

    const chip = getChip();

    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(chip).not.toHaveAttribute('tabindex');
    expect(chip).toHaveClass('bg-feedback-info-secondary-transparency-30');
  });
});
