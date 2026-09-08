import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  PlatformIdentifier,
  RegisteredProductVersionsListQuery,
} from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenctiVersionFilter } from './OpenctiVersionFilter';

const VERSION_ZULU = '7.0';
const VERSION_ALPHA = '6.8';

const removeFilterMock = vi.fn();
const setOpenctiVersionsMock = vi.fn();
const removeOpenctiVersionsMock = vi.fn();
const clearJustAddedFilterMock = vi.fn();

let storedOpenctiVersions: Record<string, string[]> = {};
// Simulates whether the filter was just picked from the add-filter
// combobox in this browser session (see `use-service-list-filters.ts`).
let wasJustAdded = false;

const mockRegisteredProductVersions = (versions: string[]) => {
  const data: RegisteredProductVersionsListQuery = {
    registeredProductVersions: versions.map((version) => ({
      __typename: 'RegisteredProductVersion',
      version,
    })),
  };
  mswServer.use(
    mockGraphqlQuery({ queryName: 'RegisteredProductVersionsList', data })
  );
};

const openPopover = async (user: ReturnType<typeof testRender>['user']) => {
  await user.click(
    screen.getByText(
      'Service.OpenctiIntegrations.Filter.OpenCTIVersion.Placeholder'
    )
  );
};

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
    get openctiVersions() {
      return storedOpenctiVersions;
    },
    setOpenctiVersions: setOpenctiVersionsMock,
    removeOpenctiVersions: removeOpenctiVersionsMock,
  }),
}));

vi.mock('@/hooks/use-service-list-filters', () => ({
  useServiceListFilters: () => ({
    removeFilter: removeFilterMock,
  }),
  wasFilterJustAdded: () => wasJustAdded,
  clearJustAddedFilter: (...args: unknown[]) =>
    clearJustAddedFilterMock(...args),
}));

describe('OpenctiVersionFilter', () => {
  beforeEach(() => {
    storedOpenctiVersions = {};
    wasJustAdded = false;
    mockRegisteredProductVersions([VERSION_ZULU, VERSION_ALPHA]);
    vi.mocked(useRegisteredPlatforms).mockReturnValue({ platforms: [] });
  });

  it('renders placeholder when no version is selected', () => {
    testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.Filter.OpenCTIVersion.Placeholder'
      )
    ).toBeInTheDocument();
  });

  it('opens the popover automatically when the filter was just added from the add-filter combobox', () => {
    wasJustAdded = true;

    testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('does not open the popover automatically on page load even when no version is selected yet', () => {
    testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not open the popover automatically when mounted with a version already selected', () => {
    storedOpenctiVersions = { [VERSION_ALPHA]: [] };

    testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears the just-added flag once mounted', () => {
    wasJustAdded = true;

    testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    expect(clearJustAddedFilterMock).toHaveBeenCalledWith(
      'k',
      ServiceListFilterKey.OpenctiVersion
    );
  });

  it('calls setOpenctiVersions with a single value when an option is selected', async () => {
    const { user } = testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    await openPopover(user);
    await user.click(
      await within(screen.getByRole('listbox')).findByText(VERSION_ALPHA)
    );

    expect(setOpenctiVersionsMock).toHaveBeenCalledWith({
      [VERSION_ALPHA]: [],
    });
  });

  it('clears the selection when the already-selected option is clicked again', async () => {
    storedOpenctiVersions = { [VERSION_ALPHA]: [] };

    const { user } = testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    await user.click(screen.getByText(VERSION_ALPHA));
    await user.click(
      await within(screen.getByRole('listbox')).findByText(VERSION_ALPHA)
    );

    expect(setOpenctiVersionsMock).toHaveBeenCalledWith({});
  });

  it('calls remove callbacks when the remove button is clicked', async () => {
    const { user } = testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    await user.click(screen.getByRole('button', { name: 'Remove filter' }));

    expect(removeOpenctiVersionsMock).toHaveBeenCalledTimes(1);
    expect(removeFilterMock).toHaveBeenCalledWith(
      ServiceListFilterKey.OpenctiVersion
    );
  });

  it('skips the registered-instance lookup on public pages', () => {
    testRender(
      <OpenctiVersionFilter
        platformIdentifier={PlatformIdentifier.Opencti}
        publicPath
      />
    );

    expect(useRegisteredPlatforms).toHaveBeenCalledWith(
      PlatformIdentifier.Opencti,
      { onlyActive: true, skip: true }
    );
  });

  it('moves the registered version to the top even though it is older than other versions', async () => {
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [{ id: 'p1', version: VERSION_ALPHA, title: 'Instance' }],
    });

    const { user } = testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    await openPopover(user);
    await within(screen.getByRole('listbox')).findByText(VERSION_ALPHA);
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    const optionTexts = options.map((option) => option.textContent);

    expect(optionTexts[0]).toContain(VERSION_ALPHA);
    expect(optionTexts[1]).toContain(VERSION_ZULU);
  });

  it('focuses the search input by default when the popover opens', async () => {
    const { user } = testRender(
      <OpenctiVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
    );

    await openPopover(user);

    expect(await screen.findByPlaceholderText('Search...')).toHaveFocus();
  });
});
