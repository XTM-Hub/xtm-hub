import { OrderingMode, UserServiceOrdering } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUserServiceListLocalstorage } from './user-service-list-localstorage';

const ORDER_MODE_KEY = 'orderModeUserServices';
const ORDER_BY_KEY = 'orderByUserServices';
const PAGE_SIZE_KEY = 'countUserServices';
const DEFAULT_PAGE_SIZE = 50;
const CUSTOM_PAGE_SIZE = 100;

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

const store = (key: string, value: unknown) =>
  window.localStorage.setItem(key, JSON.stringify(value));

describe('useUserServiceListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the default ordering and page size when nothing is stored', () => {
    // Given / When
    const { result } = renderHook(() => useUserServiceListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: UserServiceOrdering.FirstName,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('should restore the ordering and page size the user stored', () => {
    // Given
    store(ORDER_MODE_KEY, OrderingMode.Desc);
    store(ORDER_BY_KEY, UserServiceOrdering.Email);
    store(PAGE_SIZE_KEY, CUSTOM_PAGE_SIZE);

    // When
    const { result } = renderHook(() => useUserServiceListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Desc,
      orderBy: UserServiceOrdering.Email,
      pageSize: CUSTOM_PAGE_SIZE,
    });
  });

  it('should fall back to the default ordering and fix the stored values when they are not valid orderings', () => {
    // Given
    store(ORDER_MODE_KEY, 'sideways');
    store(ORDER_BY_KEY, 'unknown_field');

    // When
    const { result } = renderHook(() => useUserServiceListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: UserServiceOrdering.FirstName,
    });
    expect(readStored(ORDER_MODE_KEY)).toBe(OrderingMode.Asc);
    expect(readStored(ORDER_BY_KEY)).toBe(UserServiceOrdering.FirstName);
  });

  it('should never expose an invalid stored ordering, not even on the first render', () => {
    // Given
    store(ORDER_MODE_KEY, 'sideways');
    store(ORDER_BY_KEY, 'unknown_field');
    const renderedOrderings: string[] = [];

    // When
    renderHook(() => {
      const preferences = useUserServiceListLocalstorage();
      renderedOrderings.push(`${preferences.orderBy} ${preferences.orderMode}`);
      return preferences;
    });

    // Then
    expect(renderedOrderings).not.toHaveLength(0);
    expect(new Set(renderedOrderings)).toEqual(
      new Set([`${UserServiceOrdering.FirstName} ${OrderingMode.Asc}`])
    );
  });

  it('should store the page size the user picks', () => {
    // Given
    const { result } = renderHook(() => useUserServiceListLocalstorage());

    // When
    act(() => {
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
    });

    // Then
    expect(result.current.pageSize).toBe(CUSTOM_PAGE_SIZE);
    expect(readStored(PAGE_SIZE_KEY)).toBe(CUSTOM_PAGE_SIZE);
  });
});
