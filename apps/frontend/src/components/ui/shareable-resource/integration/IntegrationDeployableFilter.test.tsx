import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationDeployableFilter } from './IntegrationDeployableFilter';

const setDeployableMock = vi.fn();

vi.mock('@/hooks/use-service-list-storage', () => ({
  useServiceListStorage: () => ({
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

  it('should send the English label of the deployment type when it is checked', async () => {
    // Given
    startAnalytics();
    const { user } = testRender(<IntegrationDeployableFilter />);

    // When
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.ManagerSupported.AutomaticDeploy',
      })
    );

    // Then
    expect(readTrackedEvents('filter_apply')).toEqual([
      {
        filter_name: 'Deployment type',
        filter_value: 'Automatic deploy',
        filter_action: 'Add',
        library: 'Integrations',
        product: 'OpenCTI',
      },
    ]);
  });
});
