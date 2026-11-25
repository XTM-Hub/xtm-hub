import { FilterSheet } from '@/components/service/components/header/filter/FilterSheet';
import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import testRender, { testRenderHook } from '@/utils/test/test-render';
import { act, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const FILTERS_BUTTON_LABEL = 'Service.List.Filters';
const CLEAR_ALL_LABEL = 'Service.List.ClearAllFilters';
const FILTER_TITLE = 'license-type-filter';
const FILTER_DESCRIPTION = 'license-type-description';
const STORAGE_KEY = ServiceListStorageKey.OpenCTIIntegrationFeeds;

const SELECTION = { 'selected-id': [] };

const renderSheet = () =>
  testRender(
    <AppServiceListStorageKeyContext storageKey={STORAGE_KEY}>
      <FilterSheet
        filters={{
          [ServiceListFilterKey.LicenseType]: {
            title: FILTER_TITLE,
            node: <div />,
          },
        }}
      />
    </AppServiceListStorageKeyContext>
  );

const renderStorage = () =>
  testRenderHook(() => useServiceListStorage(STORAGE_KEY));

describe('FilterSheet', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should show the given filters in the sheet when the filters button is clicked', async () => {
    // Given
    const { user } = testRender(
      <AppServiceListStorageKeyContext storageKey={STORAGE_KEY}>
        <FilterSheet
          filters={{
            [ServiceListFilterKey.LicenseType]: {
              title: FILTER_TITLE,
              node: <div />,
            },
          }}
        />
      </AppServiceListStorageKeyContext>
    );

    // When
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // Then
    expect(
      within(
        screen.getByRole('dialog', { name: FILTERS_BUTTON_LABEL })
      ).getByRole('button', { name: FILTER_TITLE })
    ).toBeInTheDocument();
  });

  it('should show the filter description as text', async () => {
    // Given
    const { user } = testRender(
      <AppServiceListStorageKeyContext storageKey={STORAGE_KEY}>
        <FilterSheet
          filters={{
            [ServiceListFilterKey.LicenseType]: {
              title: FILTER_TITLE,
              description: FILTER_DESCRIPTION,
              node: <div />,
            },
          }}
        />
      </AppServiceListStorageKeyContext>
    );

    // When
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // Then
    expect(
      within(
        screen.getByRole('dialog', { name: FILTERS_BUTTON_LABEL })
      ).getByText(FILTER_DESCRIPTION)
    ).toBeVisible();
  });

  it('should not show the clear all button when no filter is selected', async () => {
    // Given
    const { user } = renderSheet();

    // When
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // Then
    expect(
      screen.queryByRole('button', { name: CLEAR_ALL_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should focus the title instead of the clear all button when the sheet opens', async () => {
    // Given
    const { result } = renderStorage();
    act(() => result.current.setLicenseTypes(SELECTION));
    const { user } = renderSheet();

    // When
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // Then
    expect(
      screen.getByRole('heading', { name: FILTERS_BUTTON_LABEL })
    ).toHaveFocus();
  });

  it('should focus the first filter when the sheet opens with no filter selected', async () => {
    // Given
    const { user } = renderSheet();

    // When
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // Then
    expect(screen.getByRole('button', { name: FILTER_TITLE })).toHaveFocus();
  });

  it('should focus the title when the user clicks clear all', async () => {
    // Given
    const { result } = renderStorage();
    act(() => result.current.setLicenseTypes(SELECTION));
    const { user } = renderSheet();
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // When
    await user.click(screen.getByRole('button', { name: CLEAR_ALL_LABEL }));

    // Then
    expect(
      screen.getByRole('heading', { name: FILTERS_BUTTON_LABEL })
    ).toHaveFocus();
  });
});
