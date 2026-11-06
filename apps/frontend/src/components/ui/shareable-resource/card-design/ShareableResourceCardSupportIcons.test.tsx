import testRender from '@/utils/test/test-render';
import { DocumentItemFragment, IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ShareableResourceCardSupportIcons } from './ShareableResourceCardSupportIcons';

vi.mock('@filigran/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/design-system')>()),
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('ShareableResourceCardSupportIcons', () => {
  const baseDocument = {
    active: true,
    manager_supported: false,
    verified: false,
    integration_type: IntegrationType.Connector,
  };

  it.each`
    description                             | documentOverrides                                | expectedIconCount | expectedLabel
    ${'connector with deployable+verified'} | ${{ manager_supported: true, verified: true }}   | ${2}              | ${'Service.ShareableResources.Details.SupportedByFiligran'}
    ${'connector not verified'}             | ${{ manager_supported: false, verified: false }} | ${1}              | ${'Service.ShareableResources.Details.SupportedByCommunity'}
  `(
    'renders expected icons for $description',
    ({
      documentOverrides,
      expectedIconCount,
      expectedLabel,
    }: {
      documentOverrides: Partial<DocumentItemFragment>;
      expectedIconCount: number;
      expectedLabel: string;
    }) => {
      const { container } = testRender(
        <ShareableResourceCardSupportIcons
          document={
            {
              ...baseDocument,
              ...documentOverrides,
            } as DocumentItemFragment
          }
        />
      );

      expect(container.querySelectorAll('svg')).toHaveLength(expectedIconCount);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      expect(screen.queryByText('Badge.Published')).not.toBeInTheDocument();
    }
  );
});
