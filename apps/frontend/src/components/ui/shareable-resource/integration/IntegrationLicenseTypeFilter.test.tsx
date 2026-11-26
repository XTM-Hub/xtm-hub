import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { LicenseType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationLicenseTypeFilter } from './IntegrationLicenseTypeFilter';

const setLicenseTypesMock = vi.fn();

vi.mock('@/hooks/use-service-list-storage', () => ({
  useServiceListStorage: () => ({
    licenseTypes: {},
    setLicenseTypes: setLicenseTypesMock,
    removeLicenseTypes: vi.fn(),
  }),
}));

describe('IntegrationLicenseTypeFilter', () => {
  it('renders license type subfilters as visible checkboxes', () => {
    testRender(<IntegrationLicenseTypeFilter />);

    expect(
      screen.getByText('Service.OpenctiIntegrations.Filter.LicenseType.Label')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.LicenseType.Free',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.LicenseType.Commercial',
      })
    ).toBeInTheDocument();
  });

  it('calls setLicenseTypes when an option is selected', async () => {
    const { user } = testRender(<IntegrationLicenseTypeFilter />);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.LicenseType.Free',
      })
    );

    expect(setLicenseTypesMock).toHaveBeenCalledWith({
      [LicenseType.Free]: [],
    });
  });

  it('does not render a clickable filter title button', () => {
    testRender(<IntegrationLicenseTypeFilter />);

    expect(
      screen.queryByRole('button', {
        name: 'Service.OpenctiIntegrations.Filter.LicenseType.Placeholder',
      })
    ).not.toBeInTheDocument();
  });

  it('should send the English label of the license type when it is checked', async () => {
    // Given
    startAnalytics();
    const { user } = testRender(<IntegrationLicenseTypeFilter />);

    // When
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.LicenseType.Commercial',
      })
    );

    // Then
    expect(readTrackedEvents('filter_apply')).toEqual([
      {
        filter_name: 'License type',
        filter_value: 'Commercial',
        filter_action: 'Add',
        library: 'Integrations',
        product: 'OpenCTI',
      },
    ]);
  });
});
