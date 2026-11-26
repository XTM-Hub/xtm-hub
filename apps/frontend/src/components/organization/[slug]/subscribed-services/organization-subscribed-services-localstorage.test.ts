import { OrderingMode, SubscriptionOrdering } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  normalizeSubscribedServicesPageSize,
  useOrganizationSubscribedServicesLocalstorage,
} from './organization-subscribed-services-localstorage';

const COLUMNS: ColumnDef<unknown>[] = [
  { id: 'service' },
  { id: 'start_date' },
  { display: 'custom' } as unknown as ColumnDef<unknown>,
];
const COLUMN_IDS = ['service', 'start_date'];
const ORDER_MODE_KEY = 'orderModeOrganizationSubscribedServicesList';
const ORDER_BY_KEY = 'orderByOrganizationSubscribedServicesList';
const PAGE_SIZE_KEY = 'countOrganizationSubscribedServicesList';
const COLUMN_ORDER_KEY = 'columnOrderingOrganizationSubscribedServicesList';
const COLUMN_VISIBILITY_KEY =
  'columnVisibilityOrganizationSubscribedServicesList';
const DEFAULT_PAGE_SIZE = 50;
const CUSTOM_PAGE_SIZE = 200;

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

describe('normalizeSubscribedServicesPageSize', () => {
  it.each([
    { value: 50, expected: 50 },
    { value: 100, expected: 100 },
    { value: 200, expected: 200 },
    { value: 300, expected: 300 },
    { value: 500, expected: 500 },
    { value: 0, expected: DEFAULT_PAGE_SIZE },
    { value: 25, expected: DEFAULT_PAGE_SIZE },
    { value: 1000, expected: DEFAULT_PAGE_SIZE },
    { value: -50, expected: DEFAULT_PAGE_SIZE },
    { value: Number.NaN, expected: DEFAULT_PAGE_SIZE },
  ])(
    'should return $expected when the page size is $value',
    ({ value, expected }) => {
      // Given / When
      const result = normalizeSubscribedServicesPageSize(value);

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('useOrganizationSubscribedServicesLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the defaults and only order the columns that have an id when nothing is stored', () => {
    // Given / When
    const { result } = renderHook(() =>
      useOrganizationSubscribedServicesLocalstorage(COLUMNS)
    );

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: SubscriptionOrdering.StartDate,
      pageSize: DEFAULT_PAGE_SIZE,
      columnOrder: COLUMN_IDS,
      columnVisibility: {},
    });
  });

  it.each([
    {
      name: 'ordering',
      key: ORDER_BY_KEY,
      stored: 'unknown_field',
      field: 'orderBy',
      expected: SubscriptionOrdering.StartDate,
    },
    {
      name: 'order mode',
      key: ORDER_MODE_KEY,
      stored: 'sideways',
      field: 'orderMode',
      expected: OrderingMode.Asc,
    },
    {
      name: 'page size',
      key: PAGE_SIZE_KEY,
      stored: 25,
      field: 'pageSize',
      expected: DEFAULT_PAGE_SIZE,
    },
  ])(
    'should fall back to the default $name and fix the stored value when the stored one is invalid',
    ({ key, stored, field, expected }) => {
      // Given
      window.localStorage.setItem(key, JSON.stringify(stored));

      // When
      const { result } = renderHook(() =>
        useOrganizationSubscribedServicesLocalstorage(COLUMNS)
      );

      // Then
      expect(result.current).toMatchObject({ [field]: expected });
      expect(readStored(key)).toBe(expected);
    }
  );

  it('should drop the stored ordering but keep the other stored preferences when removeOrder is called', () => {
    // Given
    const { result } = renderHook(() =>
      useOrganizationSubscribedServicesLocalstorage(COLUMNS)
    );
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setOrderBy(SubscriptionOrdering.ServiceName);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
    });

    // When
    act(() => {
      result.current.removeOrder();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: SubscriptionOrdering.StartDate,
      pageSize: CUSTOM_PAGE_SIZE,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBe(CUSTOM_PAGE_SIZE);
  });

  it('should drop every stored preference when resetAll is called', () => {
    // Given
    const { result } = renderHook(() =>
      useOrganizationSubscribedServicesLocalstorage(COLUMNS)
    );
    act(() => {
      result.current.setOrderMode(OrderingMode.Desc);
      result.current.setOrderBy(SubscriptionOrdering.ServiceName);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
      result.current.setColumnOrder(['start_date']);
      result.current.setColumnVisibility({ start_date: false });
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: OrderingMode.Asc,
      orderBy: SubscriptionOrdering.StartDate,
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
