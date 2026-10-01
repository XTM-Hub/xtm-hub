import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrationProductVersionFilter } from './IntegrationProductVersionFilter';

const PLACEHOLDER =
  'Service.OpenctiIntegrations.Filter.ProductVersion.Placeholder';
const REGISTERED_TOOLTIP =
  'Service.OpenctiIntegrations.Filter.ProductVersion.RegisteredTooltip';

const setProductVersionsMock = vi.fn();
const useRegisteredProductVersionsMock = vi.fn();

vi.mock('@/hooks/use-registered-product-versions', () => ({
  useRegisteredProductVersions: (...args: unknown[]) =>
    useRegisteredProductVersionsMock(...args),
}));

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: {
    OpenCTIIntegrationFeeds: 'feeds',
  },
  useServiceListLocalStorage: () => ({
    productVersions: {},
    setProductVersions: setProductVersionsMock,
    removeProductVersions: vi.fn(),
  }),
}));

describe('IntegrationProductVersionFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRegisteredProductVersionsMock.mockReturnValue({
      versions: ['6.6.0', '6.5.0'],
    });
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [{ version: '6.5.0' }],
    });
  });

  it('renders the known OpenCTI versions as combobox options once opened', async () => {
    const { user } = testRender(<IntegrationProductVersionFilter />);

    expect(screen.getByText(PLACEHOLDER)).toBeInTheDocument();
    await user.click(screen.getByText(PLACEHOLDER));

    expect(screen.getByText('6.6.0')).toBeInTheDocument();
    expect(screen.getByText('6.5.0')).toBeInTheDocument();
  });

  it('marks the version matching a registered platform with the verified icon', async () => {
    const { user } = testRender(<IntegrationProductVersionFilter />);

    await user.click(screen.getByText(PLACEHOLDER));

    expect(
      screen.getByRole('img', { name: REGISTERED_TOOLTIP })
    ).toBeInTheDocument();
  });

  it('forwards the registered platform versions to useRegisteredProductVersions', async () => {
    testRender(<IntegrationProductVersionFilter />);

    expect(useRegisteredProductVersionsMock).toHaveBeenCalledWith(
      'opencti',
      expect.objectContaining({ registeredVersions: ['6.5.0'] })
    );
  });

  it('selects only the chosen version when an option is picked', async () => {
    const { user } = testRender(<IntegrationProductVersionFilter />);

    await user.click(screen.getByText(PLACEHOLDER));
    await user.click(screen.getByText('6.6.0'));

    expect(setProductVersionsMock).toHaveBeenCalledWith({ '6.6.0': [] });
  });
});
