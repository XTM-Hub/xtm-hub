'use client';
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
import type { Arguments } from '@dnd-kit/sortable/dist/hooks/useSortable';
import { type Transform } from '@dnd-kit/utilities';
import {
  ArrowNextIcon,
  ArrowPreviousIcon,
  CloseIcon,
  DragIndicatorIcon,
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
  MoreVertIcon,
  TableTuneIcon,
  VisibilityOffIcon,
} from '@filigran/icon';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Cell,
  type Column,
  type ColumnDef,
  type Header,
  type Row,
  type SortDirection,
  type StringOrTemplateHeader,
  type TableOptions,
  type TableState,
  type Table as TableType,
} from '@tanstack/react-table';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { cn, fixedForwardRef } from '../../lib/utils';
import { Button, Skeleton } from '../servers';
import { Checkbox } from './checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

type ColumnDefWithOptionsHeader<TData, TValue> = ColumnDef<TData, TValue> & {
  optionsHeader?: StringOrTemplateHeader<TData, TValue>;
};

interface DataTableProps<TData extends { id: string }, TValue> {
  columns: ColumnDefWithOptionsHeader<TData, TValue>[];
  data: TData[];
  toolbar?: ReactNode;
  tableState?: Partial<TableState>;
  tableOptions?: Partial<TableOptions<TData>>;
  onClickRow?: (row: Row<TData>) => void;
  isLoading?: boolean;
  i18nKey?: Partial<DatatableI18nKey>;
  onResetTable?: () => void;
  sticky?: boolean;
  selectionOptions?: DataTableSelectionConfig<TData>;
}

interface DatatableI18nKey {
  'Rows per page': string;
  'Manage columns visibility': string;
  Asc: string;
  Desc: string;
  Hide: string;
  'Go to first page': string;
  'Go to previous page': string;
  'Go to next page': string;
  'Go to last page': string;
  Columns: string;
  'Reset table': string;
}
const defaultI18nKey: DatatableI18nKey = {
  'Rows per page': 'Rows per page',
  'Manage columns visibility': 'Manage columns visibility',
  Asc: 'Asc',
  Desc: 'Desc',
  Hide: 'Hide',
  'Go to first page': 'Go to first page',
  'Go to previous page': 'Go to previous page',
  'Go to next page': 'Go to next page',
  'Go to last page': 'Go to last page',
  Columns: 'Columns',
  'Reset table': 'Reset table',
};

interface TableContextProps<TData> {
  table: TableType<TData>;
  t_i18n: (key: string) => string;
  onResetTable?: () => void;
  selectionHandlers?: DataTableSelectionHandlers<TData>;
}

const TableContext = createContext<TableContextProps<any>>({
  table: {} as TableType<any>,
  t_i18n: (key) => key,
  onResetTable: () => {},
  selectionHandlers: undefined,
});

function getTransformString({ x, y }: Transform) {
  return `translate(${x}px, ${y}px)`;
}

const DefaultToolbar = () => {
  return (
    <div className="flex items-center justify-end">
      <DataTableHeadBarOptions />
    </div>
  );
};

const DataTableSelectColumnVisibility = <TData,>() => {
  const { table, t_i18n, onResetTable } = useContext(TableContext);

  const onClickResetTable = useCallback(() => {
    table.reset();
    if (onResetTable) {
      onResetTable();
    }
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-none shrink-0"
          aria-label={t_i18n('Manage columns visibility')}>
          <TableTuneIcon className="h-[1.125rem] w-[1.125rem] text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onClickResetTable()}>
          {t_i18n('Reset table')}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t_i18n('Columns')}</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }>
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {t_i18n('Rows per page')}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(pageSize) =>
                  table.setPageSize(Number(pageSize))
                }>
                {[50, 100, 200, 300, 500].map((pageSize) => (
                  <DropdownMenuRadioItem
                    value={String(pageSize)}
                    key={pageSize}>
                    {pageSize}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SortIcon = ({ sortState }: { sortState: SortDirection | false }) => {
  const iconMapping = {
    desc: <KeyboardArrowDownIcon className="ml-s size-3 text-text-secondary" />,
    asc: <KeyboardArrowUpIcon className="ml-s size-3 text-text-secondary" />,
    default: null,
  };

  if (sortState === false) {
    return iconMapping.default;
  }

  return iconMapping[sortState] || iconMapping.default;
};

const DataTableOptionsHeader = <TData, TValue>({
  column,
  menuItems,
  className,
}: {
  column: Column<TData, TValue>;
  menuItems?: ReactNode;
  className?: string;
}) => {
  const { t_i18n } = useContext(TableContext);

  if (!column.getCanSort() && !column.getCanHide() && !menuItems) {
    return null;
  }
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 text-muted-foreground">
            <MoreVertIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {column.getCanSort() && (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <KeyboardArrowUpIcon className="mr-2 size-3 text-text-secondary" />
                {t_i18n('Asc')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <KeyboardArrowDownIcon className="mr-2 size-3 text-text-secondary" />
                {t_i18n('Desc')}
              </DropdownMenuItem>
            </>
          )}
          {(menuItems || (column.getCanHide() && column.getCanSort())) && (
            <DropdownMenuSeparator />
          )}

          {column.getCanHide() && (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <VisibilityOffIcon className="mr-2 h-4 w-4 text-text-secondary" />
              {t_i18n('Hide')}
            </DropdownMenuItem>
          )}
          {menuItems}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
const DraggableTableHeader = <TData, TValue>({
  header,
  sticky,
}: {
  header: Header<TData, TValue>;
  sticky: boolean;
}) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useSortable({
      id: header.column.id,
    } as Arguments);

  const thStyles = useMemo(() => {
    const styles: Record<string, string | number> = {
      transform: transform ? getTransformString(transform) : '',
    };
    const size = header.getSize();
    // if size is -1, it means the column has no size and will expand to fit the available space
    if (size !== -1) {
      styles.minWidth = size;
      styles.width = size;
    }
    return styles;
  }, [header, transform]);

  const optionsHeader = (
    header.column.columnDef as ColumnDefWithOptionsHeader<TData, TValue>
  ).optionsHeader;

  return (
    <TableHead
      key={header.id}
      colSpan={header.colSpan}
      className={cn(
        'transition-width truncate group z-10 whitespace-nowrap opacity-100 transition-transform duration-200 ease-in-out top-0 bg-background normal-case',
        isDragging && 'z-10 bg-text-secondary/50 opacity-80',
        sticky && 'sticky'
      )}
      ref={setNodeRef}
      style={thStyles}>
      {!header.column.getIsPinned() && (
        <button
          className={cn(
            'cursor-grab opacity-0 focus:opacity-100 group-hover:opacity-100 absolute left-0 top-0 bottom-0 w-4 text-muted-foreground',
            isDragging && 'cursor-grabbing'
          )}
          {...attributes}
          {...listeners}>
          <DragIndicatorIcon className="size-3" />
        </button>
      )}
      <div
        className={cn('flex items-center justify-between', sticky && 'h-full')}>
        {header.isPlaceholder ? null : (
          <span
            className={cn(
              'flex items-center',
              header.column.getCanSort() && 'cursor-pointer select-none'
            )}
            onClick={header.column.getToggleSortingHandler()}>
            {flexRender(header.column.columnDef.header, header.getContext())}
            <SortIcon sortState={header.column.getIsSorted()} />
          </span>
        )}
        <div className="opacity-0 group-hover:opacity-100">
          {optionsHeader ? (
            flexRender(optionsHeader, header.getContext())
          ) : (
            <DataTableOptionsHeader column={header.column} />
          )}
        </div>
      </div>
      {header.column.getCanResize() && (
        <div
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            `absolute right-0 top-0 bottom-0 flex justify-center w-s cursor-col-resize select-none opacity-0`,
            header.column.getIsResizing() && `opacity-100`,
            !isDragging && 'group-hover:opacity-100'
          )}>
          <span className="w-[0.125rem] h-full bg-primary" />
        </div>
      )}
    </TableHead>
  );
};

const DragAlongCell = <TData,>({
  cell,
}: {
  cell: Cell<TData, unknown>;
  isLoading?: boolean;
}) => {
  const { isDragging, setNodeRef, transform } = useSortable({
    id: cell.column.id,
  } as Arguments);
  return (
    <TableCell
      key={cell.id}
      ref={setNodeRef}
      style={{
        maxWidth: cell.column.getSize(),
        width: cell.column.getSize(),
        transform: transform ? getTransformString(transform) : '',
      }}
      className={cn(
        'transition-width truncate group relative z-0 opacity-100 transition-transform duration-200 ease-in-out',
        isDragging && 'z-10 opacity-80'
      )}>
      <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
    </TableCell>
  );
};

const DataTableHeadBarOptions = () => {
  const { table, t_i18n } = useContext(TableContext);
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  return (
    <>
      <div className="shrink-0 box-border inline-flex h-9 items-center rounded border border-elevation-border-strong-layer-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-none"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t_i18n('Go to previous page')}>
          <ArrowPreviousIcon className="size-3 text-primary" />
        </Button>
        <div className="px-s leading-none text-text-secondary txt-sub-content ">
          <span className="text-foreground">
            {table.getRowCount() > 0 ? pageIndex * pageSize + 1 : 0}
            {' - '}
            {Math.min((pageIndex + 1) * pageSize, table.getRowCount())}
          </span>{' '}
          / {table.getRowCount()}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-none"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label={t_i18n('Go to next page')}>
          <ArrowNextIcon className="size-3 text-primary" />
        </Button>

        <DataTableSelectColumnVisibility />
      </div>
    </>
  );
};

const LoadingRows = <TData,>({ table }: { table: TableType<TData> }) => {
  return (
    <>
      {Array(30)
        .fill({})
        .map((_, index) => (
          <LoadingRow
            key={index}
            table={table}
          />
        ))}
    </>
  );
};

const LoadingRow = <TData,>({ table }: { table: TableType<TData> }) => {
  return (
    <>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          className="hover:bg-inherit"
          key={headerGroup.id}>
          {headerGroup.headers.map((_, index) => (
            <TableCell key={index}>
              <Skeleton className="h-l w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

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

  const toggleRow = useCallback((row: Row<TData>): void => {
    if (!row.getCanSelect()) return;
    setSelection((prev) => {
      const key = prev.selectAll ? 'excludedIds' : 'selectedIds';
      const newSet = new Set(prev[key]);
      newSet.has(row.id) ? newSet.delete(row.id) : newSet.add(row.id);
      return { ...prev, [key]: newSet };
    });
  }, []);

  const toggleSelectAll = useCallback((): void => {
    setSelection((prev) => ({
      selectAll: !prev.selectAll,
      selectedIds: new Set<string>(),
      excludedIds: new Set<string>(),
    }));
  }, []);

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
  }, []);

  const isAllSelected = useCallback(
    (table: TableType<TData>): boolean => {
      const selectableRows = table
        .getRowModel()
        .rows.filter((r) => r.getCanSelect());
      const selectableCount = selectableRows.length;

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
      const selectableRows = table
        .getRowModel()
        .rows.filter((r) => r.getCanSelect());
      const selectableCount = selectableRows.length;

      if (selectableCount === 0) return false;

      if (selection.selectAll) {
        // Some selected if we have exclusions but not all are excluded
        return (
          selection.excludedIds.size > 0 &&
          selection.excludedIds.size < selectableCount
        );
      }
      // Some selected if we have selections but not all are selected
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

interface SelectionHeaderProps<TData> {
  totalSelectableCount?: number;
  actions?: (props: { selectionState: SelectionState }) => ReactNode;
  selectionState: SelectionState;
}

const DefaultSelectionHeader = <TData,>({
  totalSelectableCount,
  actions,
  selectionState,
}: SelectionHeaderProps<TData>) => {
  const { table, selectionHandlers } = useContext(TableContext);

  if (!selectionHandlers) return null;

  const selectedCount =
    selectionHandlers.getSelectionCount(table, totalSelectableCount) || 0;
  return (
    <div
      className={cn(
        'flex justify-between items-center w-full pl-4',
        'transition-all duration-200 ease-in-out',
        selectedCount > 0
          ? 'bg-[hsl(var(--bg-elevation-hover-layer-0)/.5)] py-3 h-12 mt-4 mb-s'
          : 'h-0 overflow-hidden'
      )}>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal lowercase">
            {`${selectedCount} selected`}
          </span>
          <Button
            variant="ghost-primary"
            size="icon"
            className="h-5 w-5"
            onClick={selectionHandlers.clearSelection}
            title="Clear selection">
            <CloseIcon className="h-2 w-2" />
          </Button>
        </div>
      </div>
      {actions && (
        <div className="pr-0">
          <div className="flex items-center justify-end gap-1 px-l">
            {actions({
              selectionState,
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export function createDefaultSelectionColumn<
  TData,
>(): ColumnDefWithOptionsHeader<TData, unknown> {
  return {
    id: 'select',
    size: 40,
    header: ({ table }) => {
      const { selectionHandlers } = useContext(TableContext);
      if (!selectionHandlers) return null;
      return (
        <Checkbox
          className="flex bg-background"
          checked={
            selectionHandlers.isAllSelected(table)
              ? true
              : selectionHandlers.isSomeSelected(table)
                ? 'indeterminate'
                : false
          }
          onCheckedChange={() => selectionHandlers.toggleSelectAll()}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row }) => {
      const { selectionHandlers } = useContext(TableContext);
      if (!selectionHandlers) return null;
      return (
        <Checkbox
          className="flex bg-background"
          checked={selectionHandlers.isRowSelected(row)}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => selectionHandlers.toggleRow(row)}
          aria-label="Select row"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
  };
}

export interface DataTableSelectionConfig<TData> {
  createSelectionColumn?: boolean;
  totalSelectableCount?: number;
  selectionState?: {
    state: SelectionState;
    onSelectionChange: Dispatch<SetStateAction<SelectionState>>;
  };
  handlers?: {
    isRowSelected?: (row: Row<TData>) => boolean;
    toggleRow?: (row: Row<TData>) => void;
    toggleSelectAll?: () => void;
    getSelectionCount?: (
      table: TableType<TData>,
      totalCount?: number
    ) => number;
    clearSelection?: () => void;
    isAllSelected?: (table: TableType<TData>) => boolean;
    isSomeSelected?: (table: TableType<TData>) => boolean;
  };
  selectionHeader?: {
    custom?: (props: { selectionState: SelectionState }) => ReactNode;
    actions?: (props: { selectionState: SelectionState }) => ReactNode;
  };
}

function GenericDataTable<TData extends { id: string }, TValue>(
  {
    columns,
    data,
    tableState,
    tableOptions,
    toolbar,
    onClickRow,
    isLoading = false,
    i18nKey,
    onResetTable,
    sticky = false,
    selectionOptions,
  }: DataTableProps<TData, TValue>,
  ref?: any
) {
  if (selectionOptions && selectionOptions?.createSelectionColumn !== false) {
    columns.unshift(createDefaultSelectionColumn());
    if (!tableState) {
      tableState = {};
    }
    if (!tableState.columnPinning) {
      tableState.columnPinning = {};
    }
    const left = tableState.columnPinning.left ?? [];
    tableState.columnPinning.left = [
      'select',
      ...left.filter((c) => c !== 'select'),
    ];
  }

  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    columns.map((c) => c.id!)
  );

  const t_i18n = (key: string): string => {
    const mergeI18n: { [index: string]: string } = {
      ...defaultI18nKey,
      ...i18nKey,
    };
    return mergeI18n[key] || key;
  };
  const table = useReactTable({
    data,
    columns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    onColumnOrderChange: setColumnOrder,
    getRowId: (c) => c.id,
    state: {
      columnOrder,
      ...tableState,
    },
    defaultColumn: {
      minSize: -1,
    },
    ...tableOptions,
  });

  useImperativeHandle(ref, () => table);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      table.setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string);
        const newIndex = columnOrder.indexOf(over.id as string);
        return arrayMove(columnOrder, oldIndex, newIndex); //this is just a splice util
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
  const defaultSelectionHandlers = useRowSelection(
    selectionState,
    selectionOptions?.selectionState?.onSelectionChange ?? setSelection
  );

  const selectionHandlers = {
    ...defaultSelectionHandlers,
    ...selectionOptions?.handlers,
  };

  const defaultSelectionHeader = (
    <DefaultSelectionHeader
      totalSelectableCount={selectionOptions?.totalSelectableCount}
      actions={selectionOptions?.selectionHeader?.actions}
      selectionState={selectionState}
    />
  );
  return (
    <TableContext.Provider
      value={{
        table,
        t_i18n,
        onResetTable,
        selectionHandlers: selectionHandlers,
      }}>
      {toolbar ? <>{toolbar}</> : <DefaultToolbar />}
      <DndContext
        id={id}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}>
        {/* do not remove twp, the class is used to isolate preflight style */}
        <div className="twp mt-m sm:mt-l">
          {selectionOptions &&
            (selectionOptions.selectionHeader?.custom ? (
              <>{selectionOptions.selectionHeader.custom}</>
            ) : (
              <>{defaultSelectionHeader}</>
            ))}
          <Table
            style={{ width: table.getCenterTotalSize() }}
            sticky={sticky}>
            <TableHeader className="[&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  className="hover:bg-inherit"
                  key={headerGroup.id}>
                  <SortableContext
                    items={table.getState().columnOrder}
                    strategy={horizontalListSortingStrategy}>
                    {headerGroup.headers.map((header) => (
                      <DraggableTableHeader
                        key={header.id}
                        header={header}
                        sticky={sticky}
                      />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <>{isLoading && <LoadingRows table={table} />}</>
              {!isLoading &&
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      row.getCanSelect() &&
                        'hover:bg-[hsl(var(--bg-elevation-hover-layer-0)/.5)]',
                      onClickRow ? 'cursor-pointer' : '',
                      !row.getCanSelect() &&
                        'bg-text-foreground/30 cursor-auto opacity-50'
                    )}
                    onClick={() =>
                      onClickRow && row.getCanSelect() ? onClickRow(row) : null
                    }>
                    {row.getVisibleCells().map((cell) => (
                      <SortableContext
                        key={cell.id}
                        items={table.getState().columnOrder}
                        strategy={horizontalListSortingStrategy}>
                        <DragAlongCell
                          key={cell.id}
                          cell={cell}
                        />
                      </SortableContext>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </DndContext>
    </TableContext.Provider>
  );
}

const DataTable = fixedForwardRef(GenericDataTable);

export {
  DataTable,
  DataTableHeadBarOptions,
  DataTableOptionsHeader,
  type ColumnDefWithOptionsHeader,
  type DatatableI18nKey,
};
