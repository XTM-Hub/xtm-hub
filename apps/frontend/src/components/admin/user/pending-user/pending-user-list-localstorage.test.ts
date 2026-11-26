import { useUserListLocalstorage } from '@/components/admin/user/pending-user/pending-user-list-localstorage';
import { UserOrdering } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const ORDER_BY_KEY = 'orderByPendingUserList';
const ORDER_MODE_KEY = 'orderModePendingUserList';
const COLUMN_ORDER_KEY = 'columnOrderingPendingUserList';
const COLUMN_VISIBILITY_KEY = 'columnVisibilityPendingUserList';
const DEFAULT_PAGE_SIZE = 50;

const getStoredValue = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

describe('useUserListLocalstorage (pending users)', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    });
  });

  it('should restore the stored ordering when it is valid', () => {
    // Given
    window.localStorage.setItem(
      ORDER_BY_KEY,
      JSON.stringify(UserOrdering.InvitationDate)
    );
    window.localStorage.setItem(ORDER_MODE_KEY, JSON.stringify('desc'));

    // When
    const { result } = renderHook(() => useUserListLocalstorage());

    // Then
    expect(result.current).toMatchObject({
      orderBy: UserOrdering.InvitationDate,
      orderMode: 'desc',
    });
  });

  it('should update the exposed and stored values when setters are called', () => {
    // Given
    const { result } = renderHook(() => useUserListLocalstorage());

    // When
    act(() => {
      result.current.setOrderBy(UserOrdering.InvitationDate);
      result.current.setOrderMode('desc');
      result.current.setColumnOrder(['email', 'invitation_date']);
      result.current.setColumnVisibility({ invitation_date: false });
    });

    // Then
    expect(result.current).toMatchObject({
      orderBy: UserOrdering.InvitationDate,
      orderMode: 'desc',
      columnOrder: ['email', 'invitation_date'],
      columnVisibility: { invitation_date: false },
    });
    expect(getStoredValue(ORDER_BY_KEY)).toBe(UserOrdering.InvitationDate);
    expect(getStoredValue(ORDER_MODE_KEY)).toBe('desc');
    expect(getStoredValue(COLUMN_ORDER_KEY)).toEqual([
      'email',
      'invitation_date',
    ]);
    expect(getStoredValue(COLUMN_VISIBILITY_KEY)).toEqual({
      invitation_date: false,
    });
  });

  it('should restore every default value and clear the storage when resetAll is called', () => {
    // Given
    const { result } = renderHook(() => useUserListLocalstorage());
    act(() => {
      result.current.setOrderBy(UserOrdering.InvitationDate);
      result.current.setOrderMode('desc');
      result.current.setColumnOrder(['email']);
      result.current.setColumnVisibility({ invitation_date: false });
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
    });
    expect(window.localStorage.getItem(ORDER_BY_KEY)).toBeNull();
    expect(window.localStorage.getItem(ORDER_MODE_KEY)).toBeNull();
    expect(window.localStorage.getItem(COLUMN_ORDER_KEY)).toBeNull();
    expect(window.localStorage.getItem(COLUMN_VISIBILITY_KEY)).toBeNull();
  });

  it('should only restore the default ordering when removeOrder is called', () => {
    // Given
    const { result } = renderHook(() => useUserListLocalstorage());
    act(() => {
      result.current.setOrderBy(UserOrdering.InvitationDate);
      result.current.setOrderMode('desc');
      result.current.setColumnOrder(['email']);
    });

    // When
    act(() => {
      result.current.removeOrder();
    });

    // Then
    expect(result.current).toMatchObject({
      orderBy: UserOrdering.Email,
      orderMode: 'asc',
      columnOrder: ['email'],
    });
    expect(window.localStorage.getItem(ORDER_BY_KEY)).toBeNull();
    expect(window.localStorage.getItem(ORDER_MODE_KEY)).toBeNull();
    expect(getStoredValue(COLUMN_ORDER_KEY)).toEqual(['email']);
  });
});
