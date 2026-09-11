import {
  ServiceListDisplayMode,
  ServiceListHeader,
} from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  useServiceListLocalStorage: vi.fn(),
  setOrderBy: vi.fn(),
  setOrderMode: vi.fn(),
  setDisplayMode: vi.fn(),
}));

vi.mock('@/utils/debounce', () => ({
  debounceHandleInput:
    (callback: (value: string) => void) =>
    (event: { target: { value: string } }) =>
      callback(event.target.value),
}));

vi.mock('@/hooks/use-service-list-local-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-local-storage')
  >()),
  useServiceListLocalStorage: testState.useServiceListLocalStorage,
}));

const buildLocalStorageState = (displayMode = ServiceListDisplayMode.List) => ({
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
    <AppServiceListLocalStorageKeyContext
      localStorageKey={ServiceListLocalStorageKey.OpenCTIIntegrationFeeds}>
      <ServiceListHeader
        search=""
        onSearchChange={vi.fn()}
        {...props}
      />
    </AppServiceListLocalStorageKeyContext>
  );

describe('ServiceListHeader', () => {
  it('renders search, actions and pagination controls', () => {
    testState.useServiceListLocalStorage.mockReturnValue(
      buildLocalStorageState()
    );

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
    testState.useServiceListLocalStorage.mockReturnValue(
      buildLocalStorageState()
    );
    const onSearchChange = vi.fn();
    const { user } = renderHeader({ onSearchChange });

    await user.type(
      screen.getByPlaceholderText('GenericActions.Search'),
      'opencti'
    );

    expect(onSearchChange).toHaveBeenLastCalledWith('opencti');
  });

  it.each`
    initialDisplayMode             | clickedLabel               | expectedMode
    ${ServiceListDisplayMode.List} | ${'Service.List.ViewTab'}  | ${ServiceListDisplayMode.Tab}
    ${ServiceListDisplayMode.Tab}  | ${'Service.List.ViewList'} | ${ServiceListDisplayMode.List}
  `(
    'changes display mode from $initialDisplayMode when clicking $clickedLabel',
    async ({ initialDisplayMode, clickedLabel, expectedMode }) => {
      testState.useServiceListLocalStorage.mockReturnValue(
        buildLocalStorageState(initialDisplayMode)
      );
      const onDisplayModeChange = vi.fn();
      const { user } = renderHeader({ onDisplayModeChange });

      await user.click(screen.getByRole('button', { name: clickedLabel }));

      expect(testState.setDisplayMode).toHaveBeenCalledWith(expectedMode);
      expect(onDisplayModeChange).toHaveBeenCalledWith(expectedMode);
    }
  );

  it.each`
    initialDisplayMode             | expectedTabClass           | expectedListClass
    ${ServiceListDisplayMode.Tab}  | ${'text-primary'}          | ${'text-muted-foreground'}
    ${ServiceListDisplayMode.List} | ${'text-muted-foreground'} | ${'text-primary'}
  `(
    'applies selected color classes for mode=$initialDisplayMode',
    ({ initialDisplayMode, expectedTabClass, expectedListClass }) => {
      testState.useServiceListLocalStorage.mockReturnValue(
        buildLocalStorageState(initialDisplayMode)
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
    testState.useServiceListLocalStorage.mockReturnValue(
      buildLocalStorageState()
    );
    const { user } = renderHeader();

    await user.click(
      screen.getByRole('button', { name: 'SortControls.SortBy asc' })
    );

    expect(testState.setOrderMode).toHaveBeenCalledWith(OrderingMode.Desc);
  });
});
