import { CONNECTOR_TYPES } from '@/components/service/integrations/connector-type/connector-type.utils';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationConnectorTypeFilter } from './IntegrationConnectorTypeFilter';

const setConnectorTypesMock = vi.fn();

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: {
    OpenCTIIntegrationFeeds: 'feeds',
  },
  useServiceListLocalStorage: () => ({
    connectorTypes: {},
    setConnectorTypes: setConnectorTypesMock,
    removeConnectorTypes: vi.fn(),
  }),
}));

describe('IntegrationConnectorTypeFilter', () => {
  it('renders one option per connector type, including hunt connectors', () => {
    testRender(<IntegrationConnectorTypeFilter />);

    expect(
      screen.getByText('Service.OpenctiIntegrations.Filter.ConnectorType.Label')
    ).toBeInTheDocument();
    for (const connectorType of CONNECTOR_TYPES) {
      expect(
        screen.getByRole('checkbox', {
          name: `Service.OpenctiIntegrations.ConnectorType.${connectorType}`,
        })
      ).toBeInTheDocument();
    }
  });

  it('calls setConnectorTypes when the hunt connector type is selected', async () => {
    const { user } = testRender(<IntegrationConnectorTypeFilter />);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.ConnectorType.INTERNAL_HUNT',
      })
    );

    expect(setConnectorTypesMock).toHaveBeenCalledWith({ INTERNAL_HUNT: [] });
  });

  it('shows the facet count of each connector type', () => {
    testRender(
      <IntegrationConnectorTypeFilter facetCounts={{ INTERNAL_HUNT: 7 }} />
    );

    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
