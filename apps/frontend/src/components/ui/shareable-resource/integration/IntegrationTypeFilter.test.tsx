import testRender from '@/utils/test/test-render';
import { IntegrationType } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationTypeFilter } from './IntegrationTypeFilter';

const setIntegrationTypesMock = vi.fn();

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: {
    OpenCTIIntegrationFeeds: 'feeds',
  },
  useServiceListLocalStorage: () => ({
    integrationTypes: {},
    setIntegrationTypes: setIntegrationTypesMock,
    removeIntegrationTypes: vi.fn(),
  }),
}));

describe('IntegrationTypeFilter', () => {
  it('renders integration subfilters as visible checkboxes', () => {
    testRender(<IntegrationTypeFilter />);

    expect(
      screen.getByText('Service.OpenctiIntegrations.Filter.Type.Label')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: `Service.OpenctiIntegrations.Type.${IntegrationType.Connector}`,
      })
    ).toBeInTheDocument();
  });

  it('renders facet count in integration subfilter labels', () => {
    testRender(
      <IntegrationTypeFilter
        facetCounts={{ [IntegrationType.Connector]: 12 }}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: new RegExp(
        `Service\\.OpenctiIntegrations\\.Type\\.${IntegrationType.Connector}`
      ),
    });
    expect(
      within(checkbox.closest('label')!).getByText('12')
    ).toBeInTheDocument();
  });

  it('calls setIntegrationTypes when Connector is selected', async () => {
    const { user } = testRender(<IntegrationTypeFilter />);

    await user.click(
      screen.getByRole('checkbox', {
        name: `Service.OpenctiIntegrations.Type.${IntegrationType.Connector}`,
      })
    );

    expect(setIntegrationTypesMock).toHaveBeenCalledWith({
      [IntegrationType.Connector]: [],
    });
  });

  it('does not render a clickable filter title button', () => {
    testRender(<IntegrationTypeFilter />);

    expect(
      screen.queryByRole('button', {
        name: 'Service.OpenctiIntegrations.Filter.Type.Placeholder',
      })
    ).not.toBeInTheDocument();
  });
});
