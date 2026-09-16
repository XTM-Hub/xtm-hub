import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationVerifiedFilter } from './IntegrationVerifiedFilter';

const setVerifiedMock = vi.fn();

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: {
    OpenCTIIntegrationFeeds: 'feeds',
  },
  useServiceListLocalStorage: () => ({
    verified: {},
    setVerified: setVerifiedMock,
    removeVerified: vi.fn(),
  }),
}));

describe('IntegrationVerifiedFilter', () => {
  it('renders verified subfilters as visible checkboxes', () => {
    testRender(<IntegrationVerifiedFilter />);

    expect(
      screen.getByText('Service.OpenctiIntegrations.Filter.Verified.Label')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.Verified.Verified',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.Verified.Unverified',
      })
    ).toBeInTheDocument();
  });

  it('calls setVerified when an option is selected', async () => {
    const { user } = testRender(<IntegrationVerifiedFilter />);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Service.OpenctiIntegrations.Filter.Verified.Verified',
      })
    );

    expect(setVerifiedMock).toHaveBeenCalledWith({ true: [] });
  });

  it('does not render a clickable filter title button', () => {
    testRender(<IntegrationVerifiedFilter />);

    expect(
      screen.queryByRole('button', {
        name: 'Service.OpenctiIntegrations.Filter.Verified.Placeholder',
      })
    ).not.toBeInTheDocument();
  });
});
