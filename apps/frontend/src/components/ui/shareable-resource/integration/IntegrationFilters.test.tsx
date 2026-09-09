import testRender from '@/utils/test/test-render';
import { IntegrationType } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationFilters } from './IntegrationFilters';

const FACET_COUNT = 8;

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: { OpenCTIIntegrationFeeds: 'feeds' },
  useServiceListLocalStorage: () => ({
    integrationTypes: {},
    setIntegrationTypes: vi.fn(),
    removeIntegrationTypes: vi.fn(),
  }),
}));

describe('IntegrationFilters', () => {
  it('should render the wrapper and pass facet counts to the integration type filter', () => {
    // Given
    const { container } = testRender(<IntegrationFilters />);

    // When

    // Then
    expect(container.firstChild).toHaveClass(
      'flex',
      'justify-between',
      'gap-s'
    );
    expect(
      screen.getByText('Service.OpenctiIntegrations.Filter.Type.Label')
    ).toBeInTheDocument();
  });

  it('should render facet counts when integration filters receive them', () => {
    // Given
    testRender(<IntegrationFilters facetCounts={{ connector: FACET_COUNT }} />);

    // When

    // Then
    const checkbox = screen.getByRole('checkbox', {
      name: new RegExp(
        `Service\\.OpenctiIntegrations\\.Type\\.${IntegrationType.Connector}`
      ),
    });
    expect(
      within(checkbox.closest('label')!).getByText(String(FACET_COUNT))
    ).toBeInTheDocument();
  });
});
