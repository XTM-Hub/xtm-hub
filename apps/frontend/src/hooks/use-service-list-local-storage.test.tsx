import {
  ServiceListDisplayMode,
  ServiceListFilterKey,
} from '@/components/service/components/header/ServiceListHeader';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  usePublicPath: vi.fn(),
  useLocalStorage: vi.fn(),
  removeFns: [] as Array<() => void>,
}));

vi.mock('@/hooks/use-public-path', () => ({
  default: testState.usePublicPath,
}));

vi.mock('usehooks-ts', () => ({
  useLocalStorage: testState.useLocalStorage,
}));

describe('useServiceListLocalStorage', () => {
  beforeEach(() => {
    testState.removeFns = [];
    testState.usePublicPath.mockReturnValue(false);
    testState.useLocalStorage.mockImplementation(
      (_key: string, defaultValue: unknown) => {
        const remove = vi.fn();
        testState.removeFns.push(remove);
        return [defaultValue, vi.fn(), remove];
      }
    );
  });

  it.each`
    isPublicPath | expectedPrefix
    ${true}      | ${'Public'}
    ${false}     | ${'Private'}
  `(
    'uses "$expectedPrefix" local storage prefix when public path is $isPublicPath',
    ({ isPublicPath, expectedPrefix }) => {
      testState.usePublicPath.mockReturnValue(isPublicPath);

      renderHook(() =>
        useServiceListLocalStorage(
          ServiceListLocalStorageKey.OpenCTICustomViews
        )
      );

      expect(testState.useLocalStorage).toHaveBeenCalledWith(
        `search${expectedPrefix}OpenCTICustomViewsList`,
        ''
      );
      expect(testState.useLocalStorage).toHaveBeenCalledWith(
        `displayMode${expectedPrefix}OpenCTICustomViewsList`,
        ServiceListDisplayMode.Tab
      );
    }
  );

  it.each`
    serviceKey                                            | expectedDefaultOrderBy
    ${ServiceListLocalStorageKey.OpenCTIIntegrationFeeds} | ${DocumentOrdering.Name}
    ${ServiceListLocalStorageKey.OpenCTICustomDashboards} | ${DocumentOrdering.CreatedAt}
  `(
    'uses $expectedDefaultOrderBy as default orderBy for $serviceKey',
    ({ serviceKey, expectedDefaultOrderBy }) => {
      renderHook(() => useServiceListLocalStorage(serviceKey));

      expect(testState.useLocalStorage).toHaveBeenCalledWith(
        expect.stringContaining('orderByPrivate'),
        expectedDefaultOrderBy
      );
    }
  );

  it('exposes expected default values', () => {
    const { result } = renderHook(() =>
      useServiceListLocalStorage(ServiceListLocalStorageKey.OpenAEVScenarios)
    );

    expect(result.current.search).toBe('');
    expect(result.current.pageSize).toBe(50);
    expect(result.current.count).toBe(50);
    expect(result.current.orderMode).toBe(OrderingMode.Asc);
    expect(result.current.displayMode).toBe(ServiceListDisplayMode.Tab);
    expect(result.current.labels).toEqual({});
    expect(result.current.selectedFilters).toEqual([]);
  });

  it('resetAll calls every local storage remover', () => {
    const { result } = renderHook(() =>
      useServiceListLocalStorage(ServiceListLocalStorageKey.OpenCTIPlaybooks)
    );

    result.current.resetAll();

    expect(testState.removeFns).toHaveLength(16);
    for (const remove of testState.removeFns) {
      expect(remove).toHaveBeenCalledOnce();
    }
  });

  it('keeps selected filters values typed from valid enum entries', () => {
    testState.useLocalStorage.mockImplementation(
      (key: string, defaultValue: unknown) => {
        const remove = vi.fn();
        testState.removeFns.push(remove);
        if (key.includes('selectedFilters')) {
          return [
            [ServiceListFilterKey.Label, ServiceListFilterKey.Verified],
            vi.fn(),
            remove,
          ];
        }
        return [defaultValue, vi.fn(), remove];
      }
    );

    const { result } = renderHook(() =>
      useServiceListLocalStorage(ServiceListLocalStorageKey.OpenCTIPlaybooks)
    );

    expect(result.current.selectedFilters).toEqual([
      ServiceListFilterKey.Label,
      ServiceListFilterKey.Verified,
    ]);
  });
});
