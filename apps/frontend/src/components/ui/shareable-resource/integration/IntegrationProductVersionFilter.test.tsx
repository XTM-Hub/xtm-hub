import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
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
  });

  it('renders the known OpenCTI versions as combobox options once opened', async () => {
    const { user } = testRender(
      <IntegrationProductVersionFilter
        registeredInstancesByVersion={{
          '6.5.0': ['Prod OpenCTI', 'Staging OpenCTI'],
        }}
      />
    );

    expect(screen.getByText(PLACEHOLDER)).toBeInTheDocument();
    await user.click(screen.getByText(PLACEHOLDER));

    expect(screen.getByText('6.6.0')).toBeInTheDocument();
    expect(screen.getByText('6.5.0')).toBeInTheDocument();
  });

  it('marks the version matching a registered platform with the verified icon', async () => {
    const { user } = testRender(
      <IntegrationProductVersionFilter
        registeredInstancesByVersion={{
          '6.5.0': ['Prod OpenCTI', 'Staging OpenCTI'],
        }}
      />
    );

    await user.click(screen.getByText(PLACEHOLDER));

    expect(
      screen.getByRole('img', { name: REGISTERED_TOOLTIP })
    ).toBeInTheDocument();
  });

  it('lists every instance name running the version in a tooltip on the adornment', async () => {
    vi.mocked(useTranslations).mockReturnValue(
      Object.assign(
        (key: string, values?: Record<string, string>) =>
          values?.name ? `${key}: ${values.name}` : key,
        { has: () => false, rich: (key: string) => key }
      ) as unknown as ReturnType<typeof useTranslations>
    );
    const { user } = testRender(
      <IntegrationProductVersionFilter
        registeredInstancesByVersion={{
          '6.5.0': ['Prod OpenCTI', 'Staging OpenCTI'],
        }}
      />
    );

    await user.click(screen.getByText(PLACEHOLDER));
    await user.hover(
      screen.getByRole('img', {
        name: `${REGISTERED_TOOLTIP}: Prod OpenCTI, Staging OpenCTI`,
      })
    );

    expect(
      (await screen.findAllByText(`${REGISTERED_TOOLTIP}: Prod OpenCTI`)).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(`${REGISTERED_TOOLTIP}: Staging OpenCTI`).length
    ).toBeGreaterThan(0);
  });

  it('forwards the registered versions to useRegisteredProductVersions to useRegisteredProductVersions', async () => {
    testRender(
      <IntegrationProductVersionFilter
        registeredInstancesByVersion={{
          '6.5.0': ['Prod OpenCTI', 'Staging OpenCTI'],
        }}
      />
    );

    expect(useRegisteredProductVersionsMock).toHaveBeenCalledWith(
      'opencti',
      expect.objectContaining({ registeredVersions: ['6.5.0'] })
    );
  });

  it('selects only the chosen version when an option is picked', async () => {
    const { user } = testRender(
      <IntegrationProductVersionFilter
        registeredInstancesByVersion={{
          '6.5.0': ['Prod OpenCTI', 'Staging OpenCTI'],
        }}
      />
    );

    await user.click(screen.getByText(PLACEHOLDER));
    await user.click(screen.getByText('6.6.0'));

    expect(setProductVersionsMock).toHaveBeenCalledWith({ '6.6.0': [] });
  });

  it('renders no registered adornment and forwards no registeredVersions when used standalone on public pages', async () => {
    const { user } = testRender(<IntegrationProductVersionFilter />);

    await user.click(screen.getByText(PLACEHOLDER));

    expect(
      screen.queryByRole('img', { name: REGISTERED_TOOLTIP })
    ).not.toBeInTheDocument();
    expect(useRegisteredProductVersionsMock).toHaveBeenCalledWith(
      'opencti',
      expect.objectContaining({ registeredVersions: [] })
    );
  });
});
