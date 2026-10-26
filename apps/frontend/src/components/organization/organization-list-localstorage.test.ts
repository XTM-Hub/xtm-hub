import { OrderingMode, OrganizationOrdering } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useOrganizationListLocalstorage } from './organization-list-localstorage';

const COLUMNS: ColumnDef<unknown>[] = [
  { id: 'name' },
  { display: 'custom' } as unknown as ColumnDef<unknown>,
  { id: 'members' },
];
const COLUMN_IDS = ['name', 'members'];
const ORDER_MODE_KEY = 'orderModeOrganizationList';
const ORDER_BY_KEY = 'orderByOrganizationList';
const PAGE_SIZE_KEY = 'countOrganizationList';
const COLUMN_ORDER_KEY = 'columnOrderingOrganizationList';
const COLUMN_VISIBILITY_KEY = 'columnVisibilityOrganizationList';
const DEFAULT_PAGE_SIZE = 50;
const CUSTOM_PAGE_SIZE = 100;

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

describe('useOrganizationListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the defaults and only order the columns that have an id when nothing is stored', () => {
    // Given / When
    const { result } = renderHook(() =>
      useOrganizationListLocalstorage(COLUMNS)
    );

    // Then
    expect(result.current).toMatchObject({
      orderMode: 'asc',
      orderBy: OrganizationOrdering.Name,
      pageSize: DEFAULT_PAGE_SIZE,
      columnOrder: COLUMN_IDS,
      columnVisibility: {},
    });
  });

  it('should fall back to the default ordering and fix the stored value when the stored one is not a valid ordering', () => {
    // Given
    window.localStorage.setItem(ORDER_BY_KEY, JSON.stringify('unknown_field'));

    // When
    const { result } = renderHook(() =>
      useOrganizationListLocalstorage(COLUMNS)
    );

    // Then
    expect(result.current.orderBy).toBe(OrganizationOrdering.Name);
    expect(readStored(ORDER_BY_KEY)).toBe(OrganizationOrdering.Name);
  });

  it('should drop the stored ordering but keep the other stored preferences when removeOrder is called', () => {
    // Given
    const { result } = renderHook(() =>
      useOrganizationListLocalstorage(COLUMNS)
    );
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
      orderMode: 'asc',
      orderBy: OrganizationOrdering.Name,
      pageSize: CUSTOM_PAGE_SIZE,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBe(CUSTOM_PAGE_SIZE);
  });

  it('should drop every stored preference when resetAll is called', () => {
    // Given
    const { result } = renderHook(() =>
      useOrganizationListLocalstorage(COLUMNS)
    );
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
      result.current.setColumnOrder(['members', 'name']);
      result.current.setColumnVisibility({ name: false });
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: 'asc',
      orderBy: OrganizationOrdering.Name,
      pageSize: DEFAULT_PAGE_SIZE,
      columnOrder: COLUMN_IDS,
      columnVisibility: {},
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBeNull();
    expect(readStored(COLUMN_ORDER_KEY)).toBeNull();
    expect(readStored(COLUMN_VISIBILITY_KEY)).toBeNull();
  });
});
