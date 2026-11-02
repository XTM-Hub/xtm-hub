import { OrderingMode, SaasPlatformOrdering } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSaasListLocalstorage } from './saas-list-localstorage';

const ORDER_MODE_KEY = 'orderModeSaasList';
const ORDER_BY_KEY = 'orderBySaasList';
const PAGE_SIZE_KEY = 'countSaasList';
const DEFAULT_PAGE_SIZE = 50;
const CUSTOM_PAGE_SIZE = 100;

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

describe('useSaasListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the default ordering and page size when nothing is stored', () => {
    // Given / When
    const { result } = renderHook(() => useSaasListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: SaasPlatformOrdering.CustomerName,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('should fall back to the default ordering and fix the stored value when the stored one is not a valid ordering', () => {
    // Given
    window.localStorage.setItem(ORDER_BY_KEY, JSON.stringify('unknown_field'));

    // When
    const { result } = renderHook(() => useSaasListLocalstorage());

    // Then
    expect(result.current.orderBy).toBe(SaasPlatformOrdering.CustomerName);
    expect(readStored(ORDER_BY_KEY)).toBe(SaasPlatformOrdering.CustomerName);
  });

  it('should never expose the field an older list ordered by, not even on the first render', () => {
    // Given
    window.localStorage.setItem(
      ORDER_BY_KEY,
      JSON.stringify('organization_name')
    );
    const renderedOrderBys: string[] = [];

    // When
    renderHook(() => {
      const preferences = useSaasListLocalstorage();
      renderedOrderBys.push(preferences.orderBy);
      return preferences;
    });

    // Then
    expect(renderedOrderBys).not.toHaveLength(0);
    expect(new Set(renderedOrderBys)).toEqual(
      new Set([SaasPlatformOrdering.CustomerName])
    );
  });

  it('should drop the stored ordering but keep the stored page size when removeOrder is called', () => {
    // Given
    const { result } = renderHook(() => useSaasListLocalstorage());
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
    });

    // When
    act(() => {
      result.current.removeOrder();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: SaasPlatformOrdering.CustomerName,
      pageSize: CUSTOM_PAGE_SIZE,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBe(CUSTOM_PAGE_SIZE);
  });

  it('should drop every stored preference when resetAll is called', () => {
    // Given
    const { result } = renderHook(() => useSaasListLocalstorage());
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: SaasPlatformOrdering.CustomerName,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBeNull();
  });
});
