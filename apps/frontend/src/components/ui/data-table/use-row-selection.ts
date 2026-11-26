import type { Row, Table as TableType } from '@tanstack/react-table';
import { useCallback, type Dispatch, type SetStateAction } from 'react';

export interface SelectionState {
  selectAll: boolean;
  selectedIds: Set<string>;
  excludedIds: Set<string>;
}

export interface DataTableSelectionHandlers<TData> {
  isRowSelected: (row: Row<TData>) => boolean;
  toggleRow: (row: Row<TData>) => void;
  toggleSelectAll: () => void;
  getSelectionCount: (table: TableType<TData>, totalCount?: number) => number;
  clearSelection: () => void;
  isAllSelected: (table: TableType<TData>) => boolean;
  isSomeSelected: (table: TableType<TData>) => boolean;
}

export function useRowSelection<TData>(
  selection: SelectionState,
  setSelection: Dispatch<SetStateAction<SelectionState>>
): DataTableSelectionHandlers<TData> {
  const isRowSelected = useCallback(
    (row: Row<TData>): boolean => {
      if (!row.getCanSelect()) return false;
      return selection.selectAll
        ? !selection.excludedIds.has(row.id)
        : selection.selectedIds.has(row.id);
    },
    [selection.selectAll, selection.excludedIds, selection.selectedIds]
  );

  const toggleRow = useCallback(
    (row: Row<TData>): void => {
      if (!row.getCanSelect()) return;
      setSelection((prev) => {
        const key = prev.selectAll ? 'excludedIds' : 'selectedIds';
        const newSet = new Set(prev[key]);
        if (newSet.has(row.id)) {
          newSet.delete(row.id);
        } else {
          newSet.add(row.id);
        }
        return { ...prev, [key]: newSet };
      });
    },
    [setSelection]
  );

  const toggleSelectAll = useCallback((): void => {
    setSelection((prev) => ({
      selectAll: !prev.selectAll,
      selectedIds: new Set<string>(),
      excludedIds: new Set<string>(),
    }));
  }, [setSelection]);

  const getSelectionCount = useCallback(
    (table: TableType<TData>, totalCount?: number): number => {
      const selectableRows = table
        .getRowModel()
        .rows.filter((r) => r.getCanSelect());
      const selectableCount = totalCount ?? selectableRows.length;
      if (selection.selectAll) {
        return selectableCount - selection.excludedIds.size;
      }
      return selection.selectedIds.size;
    },
    [
      selection.selectAll,
      selection.excludedIds.size,
      selection.selectedIds.size,
    ]
  );

  const clearSelection = useCallback((): void => {
    setSelection({
      selectAll: false,
      selectedIds: new Set<string>(),
      excludedIds: new Set<string>(),
    });
  }, [setSelection]);

  const isAllSelected = useCallback(
    (table: TableType<TData>): boolean => {
      const selectableCount = table
        .getRowModel()
        .rows.filter((r) => r.getCanSelect()).length;

      if (selectableCount === 0) return false;

      if (selection.selectAll) {
        return selection.excludedIds.size === 0;
      }
      return selection.selectedIds.size === selectableCount;
    },
    [
      selection.selectAll,
      selection.excludedIds.size,
      selection.selectedIds.size,
    ]
  );

  const isSomeSelected = useCallback(
    (table: TableType<TData>): boolean => {
      const selectableCount = table
        .getRowModel()
        .rows.filter((r) => r.getCanSelect()).length;

      if (selectableCount === 0) return false;

      if (selection.selectAll) {
        return (
          selection.excludedIds.size > 0 &&
          selection.excludedIds.size < selectableCount
        );
      }
      return (
        selection.selectedIds.size > 0 &&
        selection.selectedIds.size < selectableCount
      );
    },
    [
      selection.selectAll,
      selection.excludedIds.size,
      selection.selectedIds.size,
    ]
  );

  return {
    isRowSelected,
    toggleRow,
    toggleSelectAll,
    getSelectionCount,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  };
}
