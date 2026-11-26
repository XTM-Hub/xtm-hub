import { CompetitorOrdering, OrderingMode } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useCompetitorListLocalstorage } from './competitor-localstorage';

const ORDER_MODE_KEY = 'orderModeCompetitorList';
const ORDER_BY_KEY = 'orderByCompetitorList';
const PAGE_SIZE_KEY = 'countCompetitorList';
const DEFAULT_PAGE_SIZE = 50;
const CUSTOM_PAGE_SIZE = 100;

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

describe('useCompetitorListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the default ordering and page size when nothing is stored', () => {
    // Given / When
    const { result } = renderHook(() => useCompetitorListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      orderMode: 'asc',
      orderBy: CompetitorOrdering.Tier,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('should fall back to the default ordering and fix the stored value when the stored one is not a valid ordering', () => {
    // Given
    window.localStorage.setItem(ORDER_BY_KEY, JSON.stringify('unknown_field'));

    // When
    const { result } = renderHook(() => useCompetitorListLocalstorage());

    // Then
    expect(result.current.orderBy).toBe(CompetitorOrdering.Tier);
    expect(readStored(ORDER_BY_KEY)).toBe(CompetitorOrdering.Tier);
  });

  it('should drop the stored ordering but keep the stored page size when removeOrder is called', () => {
    // Given
    const { result } = renderHook(() => useCompetitorListLocalstorage());
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setOrderBy(CompetitorOrdering.Name);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
    });

    // When
    act(() => {
      result.current.removeOrder();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: 'asc',
      orderBy: CompetitorOrdering.Tier,
      pageSize: CUSTOM_PAGE_SIZE,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBe(CUSTOM_PAGE_SIZE);
  });

  it('should drop every stored preference when resetAll is called', () => {
    // Given
    const { result } = renderHook(() => useCompetitorListLocalstorage());
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setOrderBy(CompetitorOrdering.Name);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: 'asc',
      orderBy: CompetitorOrdering.Tier,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBeNull();
  });
});
