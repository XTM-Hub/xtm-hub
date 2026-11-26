import {
  DEPLOYABLE_PARAM,
  emptyFilters,
  INTEGRATION_TYPE_PARAM,
  LABEL_PARAM,
  LICENSE_TYPE_PARAM,
  PRODUCT_VERSION_PARAM,
  SOLUTION_CATEGORY_PARAM,
  VERIFIED_PARAM,
} from '@/components/service/integrations/[serviceInstanceId]/integration-list-url-filters.utils';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const FILTER_PARAMS = [
  INTEGRATION_TYPE_PARAM,
  LABEL_PARAM,
  DEPLOYABLE_PARAM,
  VERIFIED_PARAM,
  PRODUCT_VERSION_PARAM,
  LICENSE_TYPE_PARAM,
  SOLUTION_CATEGORY_PARAM,
];
const LABEL = 'siem';
const PRIVATE_LABELS_KEY = 'labelPrivateOpenCTIIntegrationFeedsList';

const storageKeyOf = (param: string) =>
  `${param}PrivateOpenCTIIntegrationFeedsList`;
const selectionOf = (param: string) => ({ [`${param}-value`]: [] });
const getStoredValue = (key: string) =>
  JSON.parse(window.sessionStorage.getItem(key) ?? 'null');

describe('useIntegrationListStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('should expose the OpenCTI integration feeds storage key', () => {
    // When
    const { result } = renderHook(() => useIntegrationListStorage());

    // Then
    expect(result.current.storageKey).toBe(
      ServiceListStorageKey.OpenCTIIntegrationFeeds
    );
  });

  it('should expose empty filters when nothing is stored', () => {
    // When
    const { result } = renderHook(() => useIntegrationListStorage());

    // Then
    expect(result.current.filters).toMatchObject(emptyFilters());
  });

  it.each(FILTER_PARAMS)(
    'should expose the stored selection as the %s filter',
    (param) => {
      // Given
      window.sessionStorage.setItem(
        storageKeyOf(param),
        JSON.stringify(selectionOf(param))
      );

      // When
      const { result } = renderHook(() => useIntegrationListStorage());

      // Then
      expect(result.current.filters).toMatchObject({
        ...emptyFilters(),
        [param]: selectionOf(param),
      });
    }
  );

  it.each(FILTER_PARAMS)(
    'should store the %s filter only when setFilters is called with it',
    (param) => {
      // Given
      const { result } = renderHook(() => useIntegrationListStorage());

      // When
      act(() => {
        result.current.setFilters({
          ...emptyFilters(),
          [param]: selectionOf(param),
        });
      });

      // Then
      expect(result.current.filters).toMatchObject({
        ...emptyFilters(),
        [param]: selectionOf(param),
      });
      for (const otherParam of FILTER_PARAMS) {
        expect(getStoredValue(storageKeyOf(otherParam))).toEqual(
          otherParam === param ? selectionOf(param) : {}
        );
      }
    }
  );

  it('should replace the previous selections when setFilters is called again', () => {
    // Given
    const { result } = renderHook(() => useIntegrationListStorage());
    act(() => {
      result.current.setFilters({
        ...emptyFilters(),
        [LABEL_PARAM]: { [LABEL]: [] },
      });
    });

    // When
    act(() => {
      result.current.setFilters({
        ...emptyFilters(),
        [VERIFIED_PARAM]: { true: [] },
      });
    });

    // Then
    expect(result.current.filters).toMatchObject({
      ...emptyFilters(),
      [VERIFIED_PARAM]: { true: [] },
    });
    expect(getStoredValue(PRIVATE_LABELS_KEY)).toEqual({});
  });

  it('should empty the filters and clear the storage when resetAll is called', () => {
    // Given
    const { result } = renderHook(() => useIntegrationListStorage());
    act(() => {
      result.current.setFilters(
        Object.fromEntries(
          FILTER_PARAMS.map((param) => [param, selectionOf(param)])
        ) as ReturnType<typeof emptyFilters>
      );
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current.filters).toMatchObject(emptyFilters());
    for (const param of FILTER_PARAMS) {
      expect(window.sessionStorage.getItem(storageKeyOf(param))).toBeNull();
    }
  });
});
