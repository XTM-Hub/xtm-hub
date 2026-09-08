import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShareableResourceCard from './ShareableResourceCard';

const saveMock = vi.fn();
let storedOpenctiVersions: Record<string, string[]> = {};

vi.mock('@/hooks/use-scroll-position', () => ({
  __esModule: true,
  default: () => ({ save: saveMock }),
}));

vi.mock(
  '@/components/service/components/ServiceListLocalStorageKeyContext',
  () => ({
    useServiceListLocalStorageKeyContext: () => ({
      localStorageKey: ServiceListLocalStorageKey.OpenCTIIntegrationFeeds,
    }),
  })
);

vi.mock('@/hooks/use-service-list-local-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-local-storage')
  >()),
  useServiceListLocalStorage: () => ({
    openctiVersions: storedOpenctiVersions,
  }),
}));

vi.mock('@filigran/ui/clients', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
}));

describe('ShareableResourceCard', () => {
  const serviceInstance = { id: 'service-id' };

  beforeEach(() => {
    storedOpenctiVersions = {};
  });

  it('renders connector card with document name and description', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);

    testRender(
      <ShareableResourceCard
        document={
          {
            id: 'doc-1',
            name: 'My Connector',
            type: 'opencti_integration',
            short_description: 'A connector description',
            integration_type: IntegrationType.Connector,
            use_cases: [],
          } as documentItem_fragment$data
        }
        detailUrl="/details"
        shareLinkUrl="/share"
        serviceInstance={serviceInstance}
      />
    );

    expect(screen.getByText('My Connector')).toBeInTheDocument();
    expect(screen.getByText('A connector description')).toBeInTheDocument();
  });

  it('renders non-connector card and applies the correct height class', async () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);
    const { container, user } = testRender(
      <ShareableResourceCard
        document={
          {
            id: 'doc-2',
            name: 'Third party',
            type: 'opencti_integration',
            short_description: 'A third-party description',
            integration_type: IntegrationType.ThirdPartyIntegration,
          } as documentItem_fragment$data
        }
        detailUrl="/details"
        shareLinkUrl="/share"
        serviceInstance={serviceInstance}
      />
    );

    expect(screen.getByText('Third party')).toBeInTheDocument();
    expect(screen.getByText('A third-party description')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('h-[300px]');
    expect(container.firstChild).toHaveClass('sm:h-[348px]');

    await user.click(screen.getByRole('link'));
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it.each`
    selectedProductVersion | product_version | expectIncompatible | description
    ${null}                | ${'6.8.3'}      | ${false}           | ${'no filter selected'}
    ${'6.8.3'}             | ${'6.8.3'}      | ${false}           | ${'connector matches selected version'}
    ${'6.9.0'}             | ${'6.8.3'}      | ${false}           | ${'connector requires an older version'}
    ${'6.8.3'}             | ${'6.9.0'}      | ${true}            | ${'connector requires a newer version'}
    ${'6.8.3'}             | ${undefined}    | ${false}           | ${'connector has no product_version metadata'}
  `(
    'marks the connector card as incompatible=$expectIncompatible when $description',
    ({ selectedProductVersion, product_version, expectIncompatible }) => {
      vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
      storedOpenctiVersions = selectedProductVersion
        ? { [selectedProductVersion]: [] }
        : {};
      const { container } = testRender(
        <ShareableResourceCard
          document={
            {
              id: 'doc-connector',
              name: 'My Connector',
              type: 'opencti_integration',
              short_description: 'A connector description',
              integration_type: IntegrationType.Connector,
              product_version,
              use_cases: [],
            } as documentItem_fragment$data
          }
          detailUrl="/details"
          shareLinkUrl="/share"
          serviceInstance={serviceInstance}
        />
      );

      if (expectIncompatible) {
        const incompatibleLabel = container.querySelector(
          '[data-incompatible]'
        );
        expect(incompatibleLabel).not.toBeNull();
        expect(incompatibleLabel).toHaveAttribute('data-incompatible', 'true');
        expect(incompatibleLabel).toHaveTextContent(product_version);
        const versionTooltip = screen
          .getAllByRole('tooltip')
          .find((tooltip) =>
            tooltip.textContent?.includes(
              'Service.OpenctiIntegrations.Filter.OpenCTIVersion.FilterIncompatibleTooltip'
            )
          );
        expect(versionTooltip).toBeTruthy();
        // Only the version label is greyed out, not the whole card.
        expect(container.firstChild).not.toHaveAttribute('data-incompatible');
      } else {
        expect(
          container.querySelector('[data-incompatible]')
        ).not.toBeInTheDocument();
      }
    }
  );
});
