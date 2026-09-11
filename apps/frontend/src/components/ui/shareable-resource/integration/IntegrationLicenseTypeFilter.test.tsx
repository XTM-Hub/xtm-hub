import testRender from '@/utils/test/test-render';
import { LicenseType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationLicenseTypeFilter } from './IntegrationLicenseTypeFilter';

const setLicenseTypesMock = vi.fn();

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: {
    OpenCTIIntegrationFeeds: 'feeds',
  },
  useServiceListLocalStorage: () => ({
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
});
