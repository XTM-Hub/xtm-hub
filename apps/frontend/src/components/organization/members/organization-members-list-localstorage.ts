import {
  type ColumnDef,
  type ColumnOrderState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

// Keys of their own: the members list keeps its settings apart from the users lists
const PAGE_SIZE_KEY = 'pageSizeOrganizationMembersList';
const COLUMN_ORDER_KEY = 'columnOrderingOrganizationMembersList';
const COLUMN_VISIBILITY_KEY = 'columnVisibilityOrganizationMembersList';
// organizationMembers serves at most 100 members a page
export const ORGANIZATION_MEMBERS_PAGE_SIZE_OPTIONS: [number, ...number[]] = [
  50, 100,
];
export const ORGANIZATION_MEMBERS_DEFAULT_PAGE_SIZE =
  ORGANIZATION_MEMBERS_PAGE_SIZE_OPTIONS[0];

// A stored size the table does not offer (edited by hand, or from an older version) falls back to the default
export const normalizeOrganizationMembersPageSize = (value: number) =>
  ORGANIZATION_MEMBERS_PAGE_SIZE_OPTIONS.includes(value)
    ? value
    : ORGANIZATION_MEMBERS_DEFAULT_PAGE_SIZE;

export const useOrganizationMembersListLocalstorage = <TData>(
  columns: ColumnDef<TData>[]
) => {
  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    PAGE_SIZE_KEY,
    ORGANIZATION_MEMBERS_DEFAULT_PAGE_SIZE
  );
  const safePageSize = normalizeOrganizationMembersPageSize(pageSize);
  useEffect(() => {
    if (pageSize !== safePageSize) {
      setPageSize(safePageSize);
    }
  }, [pageSize, safePageSize, setPageSize]);
  // Starts from the column ids: the table drags columns within this list, so an empty one leaves nothing to drag
  const [columnOrder, setColumnOrder, removeColumnOrder] =
    useLocalStorage<ColumnOrderState>(
      COLUMN_ORDER_KEY,
      columns.flatMap((column) => (column.id ? [column.id] : []))
    );
  const [columnVisibility, setColumnVisibility, removeColumnVisibility] =
    useLocalStorage<VisibilityState>(COLUMN_VISIBILITY_KEY, {});

  const resetAll = () => {
    removePageSize();
    removeColumnOrder();
    removeColumnVisibility();
  };

  return {
    pageSize: safePageSize,
    setPageSize,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    resetAll,
  };
};
