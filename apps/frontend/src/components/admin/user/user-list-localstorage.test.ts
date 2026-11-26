import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { UserOrdering } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const ORDER_BY_KEY = 'orderByUserList';
const ORDER_MODE_KEY = 'orderModeUserList';
const COLUMN_ORDER_KEY = 'columnOrderingUserList';
const COLUMN_VISIBILITY_KEY = 'columnVisibilityUserList';
const ORGANIZATION_FILTER_KEY = 'organizationFilterUserList';
const DEFAULT_PAGE_SIZE = 50;
const ORGANIZATION_ID = 'organization-id';

const getStoredValue = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');
const getSessionStoredValue = (key: string) =>
  JSON.parse(window.sessionStorage.getItem(key) ?? 'null');

describe('useUserListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('should expose the default list settings when nothing is stored', () => {
    // When
    const { result } = renderHook(() => useUserListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      count: DEFAULT_PAGE_SIZE,
      pageSize: DEFAULT_PAGE_SIZE,
      orderBy: UserOrdering.Email,
      orderMode: 'asc',
      columnOrder: [],
      columnVisibility: {},
      organizationFilter: undefined,
    });
  });

  it('should restore the stored ordering when it is valid', () => {
    // Given
    window.localStorage.setItem(
      ORDER_BY_KEY,
      JSON.stringify(UserOrdering.LastName)
    );
    window.localStorage.setItem(ORDER_MODE_KEY, JSON.stringify('desc'));

    // When
    const { result } = renderHook(() => useUserListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      orderBy: UserOrdering.LastName,
      orderMode: 'desc',
    });
  });

  it('should update the exposed and stored values when setters are called', () => {
    // Given
    const { result } = renderHook(() => useUserListLocalstorage());

    // When
    act(() => {
      result.current.setOrderBy(UserOrdering.Country);
      result.current.setOrderMode('desc');
      result.current.setColumnOrder(['email', 'country']);
      result.current.setColumnVisibility({ country: false });
      result.current.setOrganizationFilter(ORGANIZATION_ID);
    });

    // Then
    expect(result.current).toMatchObject({
      orderBy: UserOrdering.Country,
      orderMode: 'desc',
      columnOrder: ['email', 'country'],
      columnVisibility: { country: false },
      organizationFilter: ORGANIZATION_ID,
    });
    expect(getStoredValue(ORDER_BY_KEY)).toBe(UserOrdering.Country);
    expect(getStoredValue(ORDER_MODE_KEY)).toBe('desc');
    expect(getStoredValue(COLUMN_ORDER_KEY)).toEqual(['email', 'country']);
    expect(getStoredValue(COLUMN_VISIBILITY_KEY)).toEqual({ country: false });
    expect(getSessionStoredValue(ORGANIZATION_FILTER_KEY)).toBe(
      ORGANIZATION_ID
    );
  });

  it('should restore every default value and clear the storage when resetAll is called', () => {
    // Given
    const { result } = renderHook(() => useUserListLocalstorage());
    act(() => {
      result.current.setOrderBy(UserOrdering.Country);
      result.current.setOrderMode('desc');
      result.current.setColumnOrder(['email']);
      result.current.setColumnVisibility({ country: false });
      result.current.setOrganizationFilter(ORGANIZATION_ID);
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current).toMatchObject({
      orderBy: UserOrdering.Email,
      orderMode: 'asc',
      columnOrder: [],
      columnVisibility: {},
      organizationFilter: undefined,
    });
    expect(window.localStorage.getItem(ORDER_BY_KEY)).toBeNull();
    expect(window.localStorage.getItem(ORDER_MODE_KEY)).toBeNull();
    expect(window.localStorage.getItem(COLUMN_ORDER_KEY)).toBeNull();
    expect(window.localStorage.getItem(COLUMN_VISIBILITY_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(ORGANIZATION_FILTER_KEY)).toBeNull();
  });

  it('should only restore the default ordering when removeOrder is called', () => {
    // Given
    const { result } = renderHook(() => useUserListLocalstorage());
    act(() => {
      result.current.setOrderBy(UserOrdering.Country);
      result.current.setOrderMode('desc');
      result.current.setOrganizationFilter(ORGANIZATION_ID);
    });

    // When
    act(() => {
      result.current.removeOrder();
    });

    // Then
    expect(result.current).toMatchObject({
      orderBy: UserOrdering.Email,
      orderMode: 'asc',
      organizationFilter: ORGANIZATION_ID,
    });
    expect(window.localStorage.getItem(ORDER_BY_KEY)).toBeNull();
    expect(window.localStorage.getItem(ORDER_MODE_KEY)).toBeNull();
    expect(getSessionStoredValue(ORGANIZATION_FILTER_KEY)).toBe(
      ORGANIZATION_ID
    );
  });
});
