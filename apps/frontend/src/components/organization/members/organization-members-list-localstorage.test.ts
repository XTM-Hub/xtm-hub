import {
  normalizeOrganizationMembersPageSize,
  useOrganizationMembersListLocalstorage,
} from '@/components/organization/members/organization-members-list-localstorage';
import { type ColumnDef } from '@tanstack/react-table';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const PAGE_SIZE_KEY = 'pageSizeOrganizationMembersList';
const COLUMN_ORDER_KEY = 'columnOrderingOrganizationMembersList';
const COLUMN_VISIBILITY_KEY = 'columnVisibilityOrganizationMembersList';
const DEFAULT_PAGE_SIZE = 50;
const NEW_PAGE_SIZE = 100;
const UNOFFERED_PAGE_SIZE = 200;
const HIDDEN_COLUMNS = { first_name: false };
const COLUMNS: ColumnDef<unknown>[] = [
  { id: 'email' },
  { id: 'first_name' },
  { accessorKey: 'roles' },
];
// The column without an id has no place in the order
const COLUMN_IDS = ['email', 'first_name'];
const REORDERED_COLUMNS = ['first_name', 'email'];

type Settings = ReturnType<typeof useOrganizationMembersListLocalstorage>;

const getStoredValue = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

describe('normalizeOrganizationMembersPageSize', () => {
  it.each([
    { value: DEFAULT_PAGE_SIZE, expected: DEFAULT_PAGE_SIZE },
    { value: NEW_PAGE_SIZE, expected: NEW_PAGE_SIZE },
    { value: UNOFFERED_PAGE_SIZE, expected: DEFAULT_PAGE_SIZE },
    { value: 0, expected: DEFAULT_PAGE_SIZE },
    { value: 25, expected: DEFAULT_PAGE_SIZE },
    { value: -50, expected: DEFAULT_PAGE_SIZE },
    { value: Number.NaN, expected: DEFAULT_PAGE_SIZE },
  ])(
    'should return $expected when the page size is $value',
    ({ value, expected }) => {
      // Given / When
      const result = normalizeOrganizationMembersPageSize(value);

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('useOrganizationMembersListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the default list settings when nothing is stored', () => {
    // Given / When
    const { result } = renderHook(() =>
      useOrganizationMembersListLocalstorage(COLUMNS)
    );

    // Then
    expect(result.current).toMatchObject({
      pageSize: DEFAULT_PAGE_SIZE,
      columnOrder: COLUMN_IDS,
      columnVisibility: {},
    });
  });

  it('should store the default page size in place of a stored size the table does not offer', () => {
    // Given
    window.localStorage.setItem(
      PAGE_SIZE_KEY,
      JSON.stringify(UNOFFERED_PAGE_SIZE)
    );

    // When
    renderHook(() => useOrganizationMembersListLocalstorage(COLUMNS));

    // Then
    expect(getStoredValue(PAGE_SIZE_KEY)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('should store the values under its own keys when setters are called', () => {
    // Given
    const { result } = renderHook(() =>
      useOrganizationMembersListLocalstorage(COLUMNS)
    );

    // When
    act(() => {
      result.current.setPageSize(NEW_PAGE_SIZE);
      result.current.setColumnOrder(REORDERED_COLUMNS);
      result.current.setColumnVisibility(HIDDEN_COLUMNS);
    });

    // Then
    expect({
      pageSize: getStoredValue(PAGE_SIZE_KEY),
      columnOrder: getStoredValue(COLUMN_ORDER_KEY),
      columnVisibility: getStoredValue(COLUMN_VISIBILITY_KEY),
    }).toEqual({
      pageSize: NEW_PAGE_SIZE,
      columnOrder: REORDERED_COLUMNS,
      columnVisibility: HIDDEN_COLUMNS,
    });
  });

  it.each([
    {
      description: 'expose the default page size',
      read: (settings: Settings): unknown => settings.pageSize,
      expected: DEFAULT_PAGE_SIZE,
    },
    {
      description: 'expose the columns in their natural order',
      read: (settings: Settings): unknown => settings.columnOrder,
      expected: COLUMN_IDS,
    },
    {
      description: 'expose every column as visible',
      read: (settings: Settings): unknown => settings.columnVisibility,
      expected: {},
    },
    {
      description: 'clear the stored page size',
      read: (): unknown => window.localStorage.getItem(PAGE_SIZE_KEY),
      expected: null,
    },
    {
      description: 'clear the stored column order',
      read: (): unknown => window.localStorage.getItem(COLUMN_ORDER_KEY),
      expected: null,
    },
    {
      description: 'clear the stored column visibility',
      read: (): unknown => window.localStorage.getItem(COLUMN_VISIBILITY_KEY),
      expected: null,
    },
  ])('should $description when resetAll is called', ({ read, expected }) => {
    // Given
    const { result } = renderHook(() =>
      useOrganizationMembersListLocalstorage(COLUMNS)
    );
    act(() => {
      result.current.setPageSize(NEW_PAGE_SIZE);
      result.current.setColumnOrder(REORDERED_COLUMNS);
      result.current.setColumnVisibility(HIDDEN_COLUMNS);
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(read(result.current)).toEqual(expected);
  });
});
