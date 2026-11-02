import {
  ServiceListDisplayMode,
  ServiceListHeader,
} from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import testRender from '@/utils/test/test-render';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

const FILTERS_BUTTON_LABEL = 'Service.List.Filters';

const testState = vi.hoisted(() => ({
  useServiceListStorage: vi.fn(),
  setOrderBy: vi.fn(),
  setOrderMode: vi.fn(),
  setDisplayMode: vi.fn(),
  cancelDebouncedSearch: vi.fn(),
}));

vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (callback: (value: string) => void) =>
    Object.assign((value: string) => callback(value), {
      cancel: testState.cancelDebouncedSearch,
    }),
}));

vi.mock('@/hooks/use-service-list-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-storage')
  >()),
  useServiceListStorage: testState.useServiceListStorage,
}));

const buildStorageState = (displayMode = ServiceListDisplayMode.List) => ({
  orderBy: DocumentOrdering.Name,
  orderMode: OrderingMode.Asc,
  setOrderBy: testState.setOrderBy,
  setOrderMode: testState.setOrderMode,
  displayMode,
  setDisplayMode: testState.setDisplayMode,
});

const renderHeader = (
  props?: Partial<ComponentProps<typeof ServiceListHeader>>
) =>
  testRender(
    <AppServiceListStorageKeyContext
      storageKey={ServiceListStorageKey.OpenCTIIntegrationFeeds}>
      <ServiceListHeader
        search=""
        onSearchChange={vi.fn()}
        {...props}
      />
    </AppServiceListStorageKeyContext>
  );

describe('ServiceListHeader', () => {
  it('renders search, actions and pagination controls', () => {
    testState.useServiceListStorage.mockReturnValue(buildStorageState());

    renderHeader({
      actions: <button type="button">extra-action</button>,
      paginationControls: <div>pagination-controls</div>,
    });

    expect(
      screen.getByPlaceholderText('GenericActions.Search')
    ).toBeInTheDocument();
    expect(screen.getByText('pagination-controls')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'extra-action' })
    ).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', async () => {
    testState.useServiceListStorage.mockReturnValue(buildStorageState());
    const onSearchChange = vi.fn();
    const { user } = renderHeader({ onSearchChange });

    await user.type(
      screen.getByPlaceholderText('GenericActions.Search'),
      'opencti'
    );

    expect(onSearchChange).toHaveBeenLastCalledWith('opencti');
  });

  it('should call onSearchChange with an empty value when clearing the search', async () => {
    // Given
    testState.useServiceListStorage.mockReturnValue(buildStorageState());
    const onSearchChange = vi.fn();
    const { user } = renderHeader({ onSearchChange });
    await user.type(
      screen.getByPlaceholderText('GenericActions.Search'),
      'opencti'
    );
    testState.cancelDebouncedSearch.mockClear();

    // When
    await user.click(
      screen.getByRole('button', { name: 'DesignSystem.SearchField.Clear' })
    );

    // Then
    expect(testState.cancelDebouncedSearch).toHaveBeenCalledOnce();
    expect(onSearchChange).toHaveBeenLastCalledWith('');
  });

  it.each`
    initialDisplayMode             | clickedLabel               | expectedMode
    ${ServiceListDisplayMode.List} | ${'Service.List.ViewTab'}  | ${ServiceListDisplayMode.Tab}
    ${ServiceListDisplayMode.Tab}  | ${'Service.List.ViewList'} | ${ServiceListDisplayMode.List}
  `(
    'changes display mode from $initialDisplayMode when clicking $clickedLabel',
    async ({ initialDisplayMode, clickedLabel, expectedMode }) => {
      testState.useServiceListStorage.mockReturnValue(
        buildStorageState(initialDisplayMode)
      );
      const onDisplayModeChange = vi.fn();
      const { user } = renderHeader({ onDisplayModeChange });

      await user.click(screen.getByRole('button', { name: clickedLabel }));

      expect(testState.setDisplayMode).toHaveBeenCalledWith(expectedMode);
      expect(onDisplayModeChange).toHaveBeenCalledWith(expectedMode);
    }
  );

  it.each`
    initialDisplayMode             | expectedTabClass         | expectedListClass
    ${ServiceListDisplayMode.Tab}  | ${'text-icon-highlight'} | ${'text-icon-subtle'}
    ${ServiceListDisplayMode.List} | ${'text-icon-subtle'}    | ${'text-icon-highlight'}
  `(
    'applies selected color classes for mode=$initialDisplayMode',
    ({ initialDisplayMode, expectedTabClass, expectedListClass }) => {
      testState.useServiceListStorage.mockReturnValue(
        buildStorageState(initialDisplayMode)
      );

      renderHeader();

      const tabIcon = screen
        .getByRole('button', { name: 'Service.List.ViewTab' })
        .querySelector('svg');
      const listIcon = screen
        .getByRole('button', { name: 'Service.List.ViewList' })
        .querySelector('svg');

      expect(tabIcon).toHaveClass(expectedTabClass);
      expect(listIcon).toHaveClass(expectedListClass);
    }
  );

  it('toggles ordering mode when clicking sort direction button', async () => {
    testState.useServiceListStorage.mockReturnValue(buildStorageState());
    const { user } = renderHeader();

    await user.click(
      screen.getByRole('button', { name: 'SortControls.SortBy asc' })
    );

    expect(testState.setOrderMode).toHaveBeenCalledWith(OrderingMode.Desc);
  });

  it('should store the sort field when the user picks another one', async () => {
    // Given
    testState.useServiceListStorage.mockReturnValue(buildStorageState());
    const { user } = renderHeader();

    // When
    await user.click(
      screen.getByRole('combobox', { name: 'SortControls.SortBy' })
    );
    await user.click(
      screen.getByRole('option', {
        name: `DocumentOrdering.${DocumentOrdering.CreatedAt}`,
      })
    );

    // Then
    expect(testState.setOrderBy).toHaveBeenCalledWith(
      DocumentOrdering.CreatedAt
    );
  });

  it('should not render the filters button when no filters are given', () => {
    // Given
    testState.useServiceListStorage.mockReturnValue(buildStorageState());

    // When
    renderHeader();

    // Then
    expect(
      screen.queryByRole('button', { name: FILTERS_BUTTON_LABEL })
    ).not.toBeInTheDocument();
  });
});
