'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import type { Transform } from '@dnd-kit/utilities';
import {
  Checkbox,
  Icon,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@filigran/design-system';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Cell,
  type CellContext,
  type Column,
  type ColumnDef,
  type Header,
  type HeaderContext,
  type Row,
  type TableOptions,
  type TableState,
  type Table as TableType,
} from '@tanstack/react-table';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

const SELECT_COLUMN_ID = 'select';
const PAGE_SIZES = [50, 100, 200, 300, 500];
const LOADING_ROW_COUNT = 30;

export interface SelectionState {
  selectAll: boolean;
  selectedIds: Set<string>;
  excludedIds: Set<string>;
}

interface DataTableSelectionHandlers<TData> {
  isRowSelected: (row: Row<TData>) => boolean;
  toggleRow: (row: Row<TData>) => void;
  toggleSelectAll: () => void;
  getSelectionCount: (table: TableType<TData>, totalCount?: number) => number;
  clearSelection: () => void;
  isAllSelected: (table: TableType<TData>) => boolean;
  isSomeSelected: (table: TableType<TData>) => boolean;
}

interface DataTableSelectionOptions {
  selectionState?: {
    state: SelectionState;
    onSelectionChange: Dispatch<SetStateAction<SelectionState>>;
  };
  selectionHeader?: {
    actions?: (props: { selectionState: SelectionState }) => ReactNode;
  };
}

export interface DataTableLabels {
  previousPageLabel?: string;
  nextPageLabel?: string;
  manageColumnsLabel?: string;
  resetTableLabel?: string;
  columnsLabel?: string;
  rowsPerPageLabel?: string;
  columnOptionsLabel?: string;
  sortAscendingLabel?: string;
  sortDescendingLabel?: string;
  hideColumnLabel?: string;
  clearSelectionLabel?: string;
  selectAllLabel?: string;
  selectRowLabel?: string;
  selectedCountLabel?: (count: number) => string;
}

export interface DataTableProps<
  TData extends { id: string },
  TValue,
> extends DataTableLabels {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: ReactNode;
  tableState?: Partial<TableState>;
  tableOptions?: Partial<TableOptions<TData>>;
  onClickRow?: (row: Row<TData>) => void;
  isLoading?: boolean;
  onResetTable?: () => void;
  selectionOptions?: DataTableSelectionOptions;
}

const defaultLabels: Required<DataTableLabels> = {
  previousPageLabel: 'Go to previous page',
  nextPageLabel: 'Go to next page',
  manageColumnsLabel: 'Manage columns visibility',
  resetTableLabel: 'Reset table',
  columnsLabel: 'Columns',
  rowsPerPageLabel: 'Rows per page',
  columnOptionsLabel: 'Column options',
  sortAscendingLabel: 'Asc',
  sortDescendingLabel: 'Desc',
  hideColumnLabel: 'Hide',
  clearSelectionLabel: 'Clear selection',
  selectAllLabel: 'Select all',
  selectRowLabel: 'Select row',
  selectedCountLabel: (count) => `${count} selected`,
};

interface DataTableContextValue<TData> {
  table: TableType<TData>;
  labels: Required<DataTableLabels>;
  onResetTable?: () => void;
  selectionHandlers: DataTableSelectionHandlers<TData>;
}

// The provider fixes TData per table; a context cannot be generic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

const useDataTableContext = <TData,>(): DataTableContextValue<TData> => {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error('DataTable parts must be rendered inside a DataTable');
  }
  return context;
};

const getTransformString = ({ x, y }: Transform) => `translate(${x}px, ${y}px)`;

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

const SelectAllHeader = <TData,>({ table }: HeaderContext<TData, unknown>) => {
  const { labels, selectionHandlers } = useDataTableContext<TData>();
  const checked = selectionHandlers.isAllSelected(table)
    ? true
    : selectionHandlers.isSomeSelected(table)
      ? 'indeterminate'
      : false;
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={() => selectionHandlers.toggleSelectAll()}
      aria-label={labels.selectAllLabel}
    />
  );
};

const SelectRowCell = <TData,>({ row }: CellContext<TData, unknown>) => {
  const { labels, selectionHandlers } = useDataTableContext<TData>();
  return (
    <Checkbox
      checked={selectionHandlers.isRowSelected(row)}
      onClick={(event) => event.stopPropagation()}
      onCheckedChange={() => selectionHandlers.toggleRow(row)}
      aria-label={labels.selectRowLabel}
    />
  );
};

const createSelectColumn = <TData,>(): ColumnDef<TData, unknown> => ({
  id: SELECT_COLUMN_ID,
  size: 40,
  header: SelectAllHeader,
  cell: SelectRowCell,
  enableSorting: false,
  enableHiding: false,
  enableResizing: false,
});

const DataTableMenu = () => {
  const { table, labels, onResetTable } = useDataTableContext();

  const onClickResetTable = useCallback(() => {
    table.reset();
    onResetTable?.();
  }, [table, onResetTable]);

  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          priority="tertiary"
          aria-label={labels.manageColumnsLabel}
          icon={
            <Icon
              name="table-properties"
              size={16}
            />
          }
        />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem onClick={onClickResetTable}>
          {labels.resetTableLabel}
        </MenuItem>
        <MenuSub>
          <MenuSubTrigger>{labels.columnsLabel}</MenuSubTrigger>
          <MenuSubContent>
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <MenuItem
                  key={column.id}
                  selected={column.getIsVisible()}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }>
                  <span className="capitalize">{column.id}</span>
                </MenuItem>
              ))}
          </MenuSubContent>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger>{labels.rowsPerPageLabel}</MenuSubTrigger>
          <MenuSubContent>
            {PAGE_SIZES.map((size) => (
              <MenuItem
                key={size}
                selected={size === table.getState().pagination.pageSize}
                onSelect={() => table.setPageSize(size)}>
                {size}
              </MenuItem>
            ))}
          </MenuSubContent>
        </MenuSub>
      </MenuContent>
    </Menu>
  );
};

const DataTableHeadBarOptions = () => {
  const { table, labels } = useDataTableContext();
  const { pageIndex, pageSize } = table.getState().pagination;
  const rowCount = table.getRowCount();
  return (
    <div className="inline-flex h-9 shrink-0 items-center rounded-sm border border-elevation-default">
      <IconButton
        priority="tertiary"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        aria-label={labels.previousPageLabel}
        icon={
          <Icon
            name="chevron-left"
            size={16}
          />
        }
      />
      <div className="px-2 content-compact text-default-secondary">
        <span className="text-default-primary">
          {rowCount > 0 ? pageIndex * pageSize + 1 : 0}
          {' - '}
          {Math.min((pageIndex + 1) * pageSize, rowCount)}
        </span>{' '}
        / {rowCount}
      </div>
      <IconButton
        priority="tertiary"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
        aria-label={labels.nextPageLabel}
        icon={
          <Icon
            name="chevron-right"
            size={16}
          />
        }
      />
      <DataTableMenu />
    </div>
  );
};

const DefaultToolbar = () => (
  <div className="flex items-center justify-end">
    <DataTableHeadBarOptions />
  </div>
);

const DataTableColumnMenu = <TData, TValue>({
  column,
}: {
  column: Column<TData, TValue>;
}) => {
  const { labels } = useDataTableContext<TData>();
  const canSort = column.getCanSort();
  const canHide = column.getCanHide();

  if (!canSort && !canHide) {
    return null;
  }
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          priority="tertiary"
          size="sm"
          aria-label={labels.columnOptionsLabel}
          icon={
            <Icon
              name="ellipsis-vertical"
              size={16}
            />
          }
        />
      </MenuTrigger>
      <MenuContent align="start">
        {canSort && (
          <>
            <MenuItem
              onClick={() => column.toggleSorting(false)}
              startIcon={
                <Icon
                  name="chevron-up"
                  size={16}
                />
              }>
              {labels.sortAscendingLabel}
            </MenuItem>
            <MenuItem
              onClick={() => column.toggleSorting(true)}
              startIcon={
                <Icon
                  name="chevron-down"
                  size={16}
                />
              }>
              {labels.sortDescendingLabel}
            </MenuItem>
          </>
        )}
        {canSort && canHide && <MenuSeparator />}
        {canHide && (
          <MenuItem
            onClick={() => column.toggleVisibility(false)}
            startIcon={
              <Icon
                name="eye-off"
                size={16}
              />
            }>
            {labels.hideColumnLabel}
          </MenuItem>
        )}
      </MenuContent>
    </Menu>
  );
};

const DataTableHeaderCell = <TData, TValue>({
  header,
}: {
  header: Header<TData, TValue>;
}) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useSortable({ id: header.column.id });

  const size = header.getSize();
  const style: CSSProperties = {
    transform: transform ? getTransformString(transform) : '',
  };
  // -1 leaves the column to share the remaining width.
  if (size !== -1) {
    style.minWidth = size;
    style.width = size;
  }
  const sorted = header.column.getIsSorted();

  return (
    <th
      ref={setNodeRef}
      colSpan={header.colSpan}
      style={style}
      className={cn(
        'relative group whitespace-nowrap truncate px-4 h-12 text-left align-middle bg-elevation-highlight content-compact-bold text-default-primary transition-transform duration-200 ease-in-out [&:has([role=checkbox])]:pr-0',
        isDragging && 'z-10 opacity-80'
      )}>
      {!header.column.getIsPinned() && (
        <button
          type="button"
          className={cn(
            'absolute left-0 top-0 bottom-0 flex w-4 cursor-grab items-center justify-center text-icon-default opacity-0 focus:opacity-100 group-hover:opacity-100',
            isDragging && 'cursor-grabbing'
          )}
          {...attributes}
          {...listeners}>
          <Icon
            name="grip-vertical"
            size={16}
          />
        </button>
      )}
      <div className="flex items-center justify-between">
        {header.isPlaceholder ? null : (
          <span
            className={cn(
              'flex items-center',
              header.column.getCanSort() && 'cursor-pointer select-none'
            )}
            onClick={header.column.getToggleSortingHandler()}>
            {flexRender(header.column.columnDef.header, header.getContext())}
            {sorted && (
              <Icon
                name={sorted === 'asc' ? 'chevron-up' : 'chevron-down'}
                size={16}
                className="ml-2 text-icon-default"
              />
            )}
          </span>
        )}
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
          <DataTableColumnMenu column={header.column} />
        </div>
      </div>
      {header.column.getCanResize() && (
        <div
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            'absolute right-0 top-0 bottom-0 flex w-2 cursor-col-resize select-none justify-center opacity-0',
            header.column.getIsResizing() && 'opacity-100',
            !isDragging && 'group-hover:opacity-100'
          )}>
          <span className="h-full w-0.5 bg-filigran-brand-primary" />
        </div>
      )}
    </th>
  );
};

const DataTableCell = <TData,>({ cell }: { cell: Cell<TData, unknown> }) => {
  const { isDragging, setNodeRef, transform } = useSortable({
    id: cell.column.id,
  });
  return (
    <td
      ref={setNodeRef}
      style={{
        maxWidth: cell.column.getSize(),
        width: cell.column.getSize(),
        transform: transform ? getTransformString(transform) : '',
      }}
      className={cn(
        'relative h-12 px-4 align-middle truncate content-compact text-default-primary transition-transform duration-200 ease-in-out [&:has([role=checkbox])]:pr-0',
        isDragging && 'z-10 opacity-80'
      )}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
};

const LoadingRows = <TData,>({ table }: { table: TableType<TData> }) => {
  const columns = table.getVisibleLeafColumns();
  return (
    <>
      {Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
        <tr
          key={rowIndex}
          className="border-b border-elevation-subtle last:border-b-0">
          {columns.map((column) => (
            <td
              key={column.id}
              className="h-12 px-4 align-middle">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

const SelectionBar = ({
  actions,
  selectionState,
}: {
  actions?: (props: { selectionState: SelectionState }) => ReactNode;
  selectionState: SelectionState;
}) => {
  const { table, labels, selectionHandlers } = useDataTableContext();
  const selectedCount = selectionHandlers.getSelectionCount(table) || 0;
  return (
    <div
      className={cn(
        'flex w-full items-center justify-between transition-all duration-200 ease-in-out',
        selectedCount > 0
          ? 'h-12 mt-4 mb-2 pl-4 bg-elevation-hover'
          : 'h-0 overflow-hidden'
      )}>
      <div className="flex items-center gap-2">
        <span className="content-compact lowercase">
          {labels.selectedCountLabel(selectedCount)}
        </span>
        <IconButton
          priority="tertiary"
          size="sm"
          onClick={selectionHandlers.clearSelection}
          aria-label={labels.clearSelectionLabel}
          icon={
            <Icon
              name="x"
              size={16}
            />
          }
        />
      </div>
      {actions && (
        <div className="flex items-center justify-end gap-1 px-4">
          {actions({ selectionState })}
        </div>
      )}
    </div>
  );
};

const DataTable = <TData extends { id: string }, TValue>({
  columns,
  data,
  tableState,
  tableOptions,
  toolbar,
  onClickRow,
  isLoading = false,
  onResetTable,
  selectionOptions,
  previousPageLabel = defaultLabels.previousPageLabel,
  nextPageLabel = defaultLabels.nextPageLabel,
  manageColumnsLabel = defaultLabels.manageColumnsLabel,
  resetTableLabel = defaultLabels.resetTableLabel,
  columnsLabel = defaultLabels.columnsLabel,
  rowsPerPageLabel = defaultLabels.rowsPerPageLabel,
  columnOptionsLabel = defaultLabels.columnOptionsLabel,
  sortAscendingLabel = defaultLabels.sortAscendingLabel,
  sortDescendingLabel = defaultLabels.sortDescendingLabel,
  hideColumnLabel = defaultLabels.hideColumnLabel,
  clearSelectionLabel = defaultLabels.clearSelectionLabel,
  selectAllLabel = defaultLabels.selectAllLabel,
  selectRowLabel = defaultLabels.selectRowLabel,
  selectedCountLabel = defaultLabels.selectedCountLabel,
}: DataTableProps<TData, TValue>) => {
  const hasSelection = !!selectionOptions;

  const tableColumns = useMemo(
    () =>
      hasSelection
        ? [createSelectColumn<TData>() as ColumnDef<TData, TValue>, ...columns]
        : columns,
    [hasSelection, columns]
  );

  const resolvedTableState: Partial<TableState> | undefined = hasSelection
    ? {
        ...tableState,
        columnPinning: {
          ...tableState?.columnPinning,
          left: [
            SELECT_COLUMN_ID,
            ...(tableState?.columnPinning?.left ?? []).filter(
              (id) => id !== SELECT_COLUMN_ID
            ),
          ],
        },
      }
    : tableState;

  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    tableColumns.map((column) => column.id!)
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    onColumnOrderChange: setColumnOrder,
    getRowId: (row) => row.id,
    state: {
      columnOrder,
      ...resolvedTableState,
    },
    defaultColumn: {
      minSize: -1,
    },
    ...tableOptions,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      table.setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id as string);
        const newIndex = order.indexOf(over.id as string);
        return arrayMove(order, oldIndex, newIndex);
      });
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );
  const id = useId();

  const [selection, setSelection] = useState<SelectionState>({
    selectAll: false,
    selectedIds: new Set<string>(),
    excludedIds: new Set<string>(),
  });
  const selectionState = selectionOptions?.selectionState?.state ?? selection;
  const selectionHandlers = useRowSelection<TData>(
    selectionState,
    selectionOptions?.selectionState?.onSelectionChange ?? setSelection
  );

  const contextValue: DataTableContextValue<TData> = {
    table,
    labels: {
      previousPageLabel,
      nextPageLabel,
      manageColumnsLabel,
      resetTableLabel,
      columnsLabel,
      rowsPerPageLabel,
      columnOptionsLabel,
      sortAscendingLabel,
      sortDescendingLabel,
      hideColumnLabel,
      clearSelectionLabel,
      selectAllLabel,
      selectRowLabel,
      selectedCountLabel,
    },
    onResetTable,
    selectionHandlers,
  };

  const columnOrderState = table.getState().columnOrder;

  return (
    <DataTableContext.Provider value={contextValue}>
      {toolbar ? toolbar : <DefaultToolbar />}
      <DndContext
        id={id}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}>
        <div className="mt-3 sm:mt-4">
          {selectionOptions && (
            <SelectionBar
              actions={selectionOptions.selectionHeader?.actions}
              selectionState={selectionState}
            />
          )}
          <div className="relative min-w-full overflow-auto">
            <table
              className="min-w-full"
              style={{ width: table.getCenterTotalSize() }}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    <SortableContext
                      items={columnOrderState}
                      strategy={horizontalListSortingStrategy}>
                      {headerGroup.headers.map((header) => (
                        <DataTableHeaderCell
                          key={header.id}
                          header={header}
                        />
                      ))}
                    </SortableContext>
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <LoadingRows table={table} />
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const canSelect = row.getCanSelect();
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-elevation-subtle transition-colors last:border-b-0',
                          canSelect
                            ? cn(
                                'hover:bg-elevation-hover',
                                onClickRow && 'cursor-pointer'
                              )
                            : 'cursor-auto opacity-50'
                        )}
                        onClick={() => {
                          if (onClickRow && canSelect) {
                            onClickRow(row);
                          }
                        }}>
                        {row.getVisibleCells().map((cell) => (
                          <SortableContext
                            key={cell.id}
                            items={columnOrderState}
                            strategy={horizontalListSortingStrategy}>
                            <DataTableCell cell={cell} />
                          </SortableContext>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DndContext>
    </DataTableContext.Provider>
  );
};

export { DataTable, DataTableHeadBarOptions };
