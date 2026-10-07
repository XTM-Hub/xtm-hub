import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ShareableResourceCardIcon } from './ShareableResourceCardIcon';

vi.mock('@filigran/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/design-system')>()),
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('ShareableResourceCardIcon', () => {
  const baseDocument = {
    active: true,
    manager_supported: false,
    verified: false,
    integration_type: IntegrationType.Connector,
  };

  it.each`
    description                             | shouldDisplayBothIcons | documentOverrides                                                              | expectedIconCount | expectedLabel
    ${'connector with deployable+verified'} | ${true}                | ${{ manager_supported: true, verified: true }}                                 | ${2}              | ${'Service.ShareableResources.Details.SupportedByFiligran'}
    ${'connector not verified'}             | ${true}                | ${{ manager_supported: false, verified: false }}                               | ${1}              | ${'Service.ShareableResources.Details.SupportedByCommunity'}
    ${'non-connector active'}               | ${false}               | ${{ integration_type: IntegrationType.ThirdPartyIntegration, verified: true }} | ${1}              | ${'Badge.Published'}
  `(
    'renders expected icons for $description',
    ({
      shouldDisplayBothIcons,
      documentOverrides,
      expectedIconCount,
      expectedLabel,
    }: {
      shouldDisplayBothIcons: boolean;
      documentOverrides: Partial<documentItem_fragment$data>;
      expectedIconCount: number;
      expectedLabel: string;
    }) => {
      const { container } = testRender(
        <ShareableResourceCardIcon
          shouldDisplayBothIcons={shouldDisplayBothIcons}
          document={
            {
              ...baseDocument,
              ...documentOverrides,
            } as documentItem_fragment$data
          }
        />
      );

      expect(container.querySelectorAll('svg')).toHaveLength(expectedIconCount);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    }
  );
});
