import { FilterSidebar } from '@/components/service/components/header/filter/FilterSidebar';
import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import testRender, {
  testRenderHook,
  TestWrapper,
} from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = ServiceListStorageKey.OpenCTIIntegrationFeeds;
const FILTERS_TITLE = 'Service.List.Filters';
const CLEAR_ALL_LABEL = 'Service.List.ClearAllFilters';
const FILTER_TITLE = 'license-type-filter';
const CHECKBOX_LABEL = 'license-type-checkbox';
const SELECTION = { 'selected-id': [] };

const LicenseTypeFilter = () => {
  const { licenseTypes, setLicenseTypes } = useServiceListStorage(STORAGE_KEY);

  return (
    <LogicalMultiSelectFormField
      options={[{ label: CHECKBOX_LABEL, value: 'license-type-id' }]}
      value={licenseTypes}
      noResultString="no-result"
      optionLabel="license-type-options"
      onValueChange={setLicenseTypes}
    />
  );
};

const filters = {
  [ServiceListFilterKey.LicenseType]: {
    title: FILTER_TITLE,
    node: <LicenseTypeFilter />,
  },
};

const renderSidebar = () =>
  testRender(
    <AppServiceListStorageKeyContext storageKey={STORAGE_KEY}>
      <FilterSidebar filters={filters} />
    </AppServiceListStorageKeyContext>
  );

const renderStorage = () =>
  testRenderHook(() => useServiceListStorage(STORAGE_KEY));

describe('FilterSidebar', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should show the filters title and the given filters', () => {
    // Given / When
    renderSidebar();

    // Then
    expect(
      screen.getByRole('heading', { name: FILTERS_TITLE })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: FILTER_TITLE })
    ).toBeInTheDocument();
  });

  it('should not show the clear all button when no filter is selected', () => {
    // Given / When
    renderSidebar();

    // Then
    expect(
      screen.queryByRole('button', { name: CLEAR_ALL_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should show the clear all button when a filter is selected', () => {
    // Given
    const { result } = renderStorage();
    act(() => result.current.setLicenseTypes(SELECTION));

    // When
    renderSidebar();

    // Then
    expect(
      screen.getByRole('button', { name: CLEAR_ALL_LABEL })
    ).toBeInTheDocument();
  });

  it('should uncheck the filter checkboxes when the user clicks clear all', async () => {
    // Given
    const { user } = renderSidebar();
    await user.click(screen.getByRole('checkbox', { name: CHECKBOX_LABEL }));

    // When
    await user.click(screen.getByRole('button', { name: CLEAR_ALL_LABEL }));

    // Then
    expect(
      screen.getByRole('checkbox', { name: CHECKBOX_LABEL })
    ).not.toBeChecked();
  });

  it('should hide the clear all button when the user clicks clear all', async () => {
    // Given
    const { result } = renderStorage();
    act(() => result.current.setLicenseTypes(SELECTION));
    const { user } = renderSidebar();

    // When
    await user.click(screen.getByRole('button', { name: CLEAR_ALL_LABEL }));

    // Then
    expect(
      screen.queryByRole('button', { name: CLEAR_ALL_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should move the focus to the filters title when the user clicks clear all', async () => {
    // Given
    const { result } = renderStorage();
    act(() => result.current.setLicenseTypes(SELECTION));
    const { user } = renderSidebar();

    // When
    await user.click(screen.getByRole('button', { name: CLEAR_ALL_LABEL }));

    // Then
    expect(screen.getByRole('heading', { name: FILTERS_TITLE })).toHaveFocus();
  });

  it('should hydrate without mismatch when a filter is stored', () => {
    // Given
    const element = (
      <TestWrapper>
        <AppServiceListStorageKeyContext storageKey={STORAGE_KEY}>
          <FilterSidebar filters={filters} />
        </AppServiceListStorageKeyContext>
      </TestWrapper>
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(element);
    const { result } = renderStorage();
    act(() => result.current.setLicenseTypes(SELECTION));
    const onRecoverableError = vi.fn();

    // When
    let root: Root | undefined;
    act(() => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });

    // Then
    expect(onRecoverableError).not.toHaveBeenCalled();
    act(() => root?.unmount());
    container.remove();
  });
});
