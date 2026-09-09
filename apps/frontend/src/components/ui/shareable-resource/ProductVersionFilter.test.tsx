import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductVersionFilter } from './ProductVersionFilter';

const PLATFORM_TITLE_ALPHA = 'Alpha';
const PLATFORM_VERSION_ALPHA = '6.8';
const PLATFORM_TITLE_ZULU = 'Zulu';
const PLATFORM_VERSION_ZULU = '7.0';

const setProductVersionsMock = vi.fn();

vi.mock(
  '@/components/service/components/ServiceListLocalStorageKeyContext',
  () => ({
    useServiceListLocalStorageKeyContext: () => ({
      localStorageKey: 'k',
    }),
  })
);

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  useServiceListLocalStorage: () => ({
    productVersions: {},
    setProductVersions: setProductVersionsMock,
    removeProductVersions: vi.fn(),
  }),
}));

describe('ProductVersionFilter', () => {
  beforeEach(() => {
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [
        { title: PLATFORM_TITLE_ZULU, version: PLATFORM_VERSION_ZULU },
        { title: PLATFORM_TITLE_ALPHA, version: PLATFORM_VERSION_ALPHA },
      ],
    });
  });

  it('renders product version subfilters in alphabetical order', () => {
    testRender(
      <ProductVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.Filter.ProductVersion.Label'
      )
    ).toBeInTheDocument();
    const labels = screen.getAllByText(/Alpha|Zulu/);
    expect(labels[0]).toHaveTextContent(PLATFORM_TITLE_ALPHA);
    expect(labels[1]).toHaveTextContent(PLATFORM_TITLE_ZULU);
  });

  it('renders facet count as a badge next to the product version option', () => {
    testRender(
      <ProductVersionFilter
        platformIdentifier={PlatformIdentifier.Opencti}
        facetCounts={{ [PLATFORM_VERSION_ALPHA]: 12 }}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /Alpha/ });
    expect(checkbox).toBeInTheDocument();
    expect(
      within(checkbox.closest('label')!).getByText('12')
    ).toBeInTheDocument();
  });

  it('calls setProductVersions when a subfilter is selected', async () => {
    const { user } = testRender(
      <ProductVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    await user.click(
      screen.getByRole('checkbox', { name: PLATFORM_TITLE_ALPHA })
    );

    expect(setProductVersionsMock).toHaveBeenCalledWith({
      [PLATFORM_VERSION_ALPHA]: [],
    });
  });
});
