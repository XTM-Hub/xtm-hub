import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationDeployableFilter } from './IntegrationDeployableFilter';

const setDeployableMock = vi.fn();

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: {
    OpenCTIIntegrationFeeds: 'feeds',
  },
  useServiceListLocalStorage: () => ({
    deployable: {},
    setDeployable: setDeployableMock,
    removeDeployable: vi.fn(),
  }),
}));

describe('IntegrationDeployableFilter', () => {
  it('renders deployable subfilters as visible checkboxes', () => {
    testRender(<IntegrationDeployableFilter />);

    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.Filter.ManagerSupported.Label'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.ManagerSupported.AutomaticDeploy',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.ManagerSupported.ManualDeploy',
      })
    ).toBeInTheDocument();
  });

  it('calls setDeployable when an option is selected', async () => {
    const { user } = testRender(<IntegrationDeployableFilter />);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.ManagerSupported.AutomaticDeploy',
      })
    );

    expect(setDeployableMock).toHaveBeenCalledWith({ true: [] });
  });

  it('does not render a clickable filter title button', () => {
    testRender(<IntegrationDeployableFilter />);

    expect(
      screen.queryByRole('button', {
        name: 'Service.OpenctiIntegrations.Filter.ManagerSupported.Placeholder',
      })
    ).not.toBeInTheDocument();
  });
});
