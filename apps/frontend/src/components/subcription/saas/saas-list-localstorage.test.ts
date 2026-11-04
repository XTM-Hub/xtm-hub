import { OrderingMode, SaasPlatformOrdering } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSaasListLocalstorage } from './saas-list-localstorage';

const ORDER_MODE_KEY = 'orderModeSaasList';
const ORDER_BY_KEY = 'orderBySaasList';
const PAGE_SIZE_KEY = 'countSaasList';
const COLUMN_ORDER_KEY = 'columnOrderingSaasList';
const COLUMN_VISIBILITY_KEY = 'columnVisibilitySaasList';
const COLUMN_SIZING_KEY = 'columnSizingSaasList';
const DEFAULT_PAGE_SIZE = 50;
const CUSTOM_PAGE_SIZE = 100;
const COLUMNS: ColumnDef<unknown>[] = [
  { id: 'customer' },
  { display: 'custom' } as unknown as ColumnDef<unknown>,
  { id: 'plan' },
  { id: 'health' },
];
const COLUMN_IDS = ['customer', 'plan', 'health'];
const CUSTOM_COLUMN_ORDER = ['plan', 'customer', 'health'];
const CUSTOM_COLUMN_VISIBILITY = { plan: false };
const CUSTOM_COLUMN_SIZING = { customer: 240 };

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

const renderSaasListHook = () =>
  renderHook(() => useSaasListLocalstorage(COLUMNS));

describe('useSaasListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the default ordering and page size when nothing is stored', () => {
    // Given / When
    const { result } = renderSaasListHook();

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: SaasPlatformOrdering.CustomerName,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('should show every column in their defined order and at their defined width when nothing is stored', () => {
    // Given / When
    const { result } = renderSaasListHook();

    // Then
    expect(result.current).toMatchObject({
      columnOrder: COLUMN_IDS,
      columnVisibility: {},
      columnSizing: {},
    });
  });

  it('should restore the column order, visibility and widths the user stored', () => {
    // Given
    window.localStorage.setItem(
      COLUMN_ORDER_KEY,
      JSON.stringify(CUSTOM_COLUMN_ORDER)
    );
    window.localStorage.setItem(
      COLUMN_VISIBILITY_KEY,
      JSON.stringify(CUSTOM_COLUMN_VISIBILITY)
    );
    window.localStorage.setItem(
      COLUMN_SIZING_KEY,
      JSON.stringify(CUSTOM_COLUMN_SIZING)
    );

    // When
    const { result } = renderSaasListHook();

    // Then
    expect(result.current).toMatchObject({
      columnOrder: CUSTOM_COLUMN_ORDER,
      columnVisibility: CUSTOM_COLUMN_VISIBILITY,
      columnSizing: CUSTOM_COLUMN_SIZING,
    });
  });

  it('should fall back to the default ordering and fix the stored value when the stored one is not a valid ordering', () => {
    // Given
    window.localStorage.setItem(ORDER_BY_KEY, JSON.stringify('unknown_field'));

    // When
    const { result } = renderSaasListHook();

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
      const preferences = useSaasListLocalstorage(COLUMNS);
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
    const { result } = renderSaasListHook();
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
    const { result } = renderSaasListHook();
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
      result.current.setColumnOrder(CUSTOM_COLUMN_ORDER);
      result.current.setColumnVisibility(CUSTOM_COLUMN_VISIBILITY);
      result.current.setColumnSizing(CUSTOM_COLUMN_SIZING);
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
      columnOrder: COLUMN_IDS,
      columnVisibility: {},
      columnSizing: {},
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBeNull();
    expect(readStored(COLUMN_ORDER_KEY)).toBeNull();
    expect(readStored(COLUMN_VISIBILITY_KEY)).toBeNull();
    expect(readStored(COLUMN_SIZING_KEY)).toBeNull();
  });
});
