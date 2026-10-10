import type { ComponentMeta } from '@filigran/design-system/meta';

export const DataTableMeta: ComponentMeta = {
  name: 'DataTable',
  description:
    'A paginated data table on TanStack Table and dnd-kit. Above it, a toolbar (the caller\'s, or by default DataTableHeadBarOptions right-aligned): a 36px bordered box with tertiary previous and next icon buttons around the "start - end / total" range counter, and a table menu (reset, Columns visibility, Rows per page 50 to 500). The header row sits on bg-elevation-highlight in content-compact-bold; a click on a sortable label toggles the sort, shown by a 16px chevron. Each header reveals on hover a drag handle to reorder columns, a column menu (Asc, Desc, Hide) and a 2px brand resize bar (double click resets the width). Body cells are 48px high in content-compact, rows separated by border-elevation-subtle, highlighted on hover; rows that cannot be selected are at 50% opacity and ignore clicks. With selectionOptions, a pinned checkbox column comes first and a selection bar on bg-elevation-hover shows the count, a clear button and the caller\'s actions once a row is picked. isLoading shows 30 rows of Skeleton.',
  status: 'beta',
  category: 'data-display',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default', 'selectable', 'loading'],
  sizes: [],
  examples: [
    '<DataTable columns={columns} data={users} tableOptions={{ manualPagination: true, manualSorting: true, rowCount: total, onPaginationChange, onSortingChange }} tableState={{ pagination, sorting }} onClickRow={(row) => router.push(`/users/${row.original.id}`)} />',
    '<DataTable columns={columns} data={pendingUsers} selectionOptions={{ selectionState: { state: selection, onSelectionChange: setSelection }, selectionHeader: { actions: ({ selectionState }) => <Button onClick={() => approve(selectionState)}>Approve</Button> } }} toolbar={<div className="flex justify-between"><SearchField /><DataTableHeadBarOptions /></div>} />',
    '<DataTable columns={columns} data={rows} isLoading={isLoading} previousPageLabel={t("DesignSystem.DataTable.PreviousPage")} nextPageLabel={t("DesignSystem.DataTable.NextPage")} selectedCountLabel={(count) => t("DesignSystem.DataTable.SelectedCount", { count })} />',
  ],
  props: {
    columns:
      'ColumnDef<TData, TValue>[] - the TanStack column definitions; never mutated (the select column is prepended on a copy).',
    data: 'TData[] - the rows; each needs a string id, used as the row id.',
    toolbar:
      'ReactNode (optional) - replaces the default toolbar (DataTableHeadBarOptions right-aligned); an empty fragment hides it. Render DataTableHeadBarOptions inside it to keep the pagination box.',
    tableState:
      'Partial<TableState> (optional) - controlled TanStack state (pagination, sorting, columnVisibility, columnPinning...), merged over the column order.',
    tableOptions:
      'Partial<TableOptions<TData>> (optional) - TanStack options spread last (manualPagination, rowCount, onPaginationChange, enableRowSelection...).',
    onClickRow:
      '(row: Row<TData>) => void (optional) - called on a click on a row that can be selected; adds the pointer cursor.',
    isLoading:
      'boolean (optional, default false) - renders 30 Skeleton rows instead of the data.',
    onResetTable:
      '() => void (optional) - called after table.reset() when the Reset item of the table menu is picked.',
    selectionOptions:
      '{ selectionState?: { state: SelectionState; onSelectionChange: Dispatch<SetStateAction<SelectionState>> }; selectionHeader?: { actions?: ({ selectionState }) => ReactNode } } (optional) - adds the pinned checkbox column and the selection bar; without selectionState the table keeps its own.',
    previousPageLabel:
      "string (optional, default 'Go to previous page') - the accessible name of the previous button; pass a translation.",
    nextPageLabel:
      "string (optional, default 'Go to next page') - the accessible name of the next button; pass a translation.",
    manageColumnsLabel:
      "string (optional, default 'Manage columns visibility') - the accessible name of the table menu button; pass a translation.",
    resetTableLabel:
      "string (optional, default 'Reset table') - the reset item of the table menu; pass a translation.",
    columnsLabel:
      "string (optional, default 'Columns') - the columns sub-menu of the table menu; pass a translation.",
    rowsPerPageLabel:
      "string (optional, default 'Rows per page') - the page size sub-menu of the table menu; pass a translation.",
    columnOptionsLabel:
      "string (optional, default 'Column options') - the accessible name of each column menu button; pass a translation.",
    sortAscendingLabel:
      "string (optional, default 'Asc') - the ascending sort item of the column menu; pass a translation.",
    sortDescendingLabel:
      "string (optional, default 'Desc') - the descending sort item of the column menu; pass a translation.",
    hideColumnLabel:
      "string (optional, default 'Hide') - the hide item of the column menu; pass a translation.",
    clearSelectionLabel:
      "string (optional, default 'Clear selection') - the accessible name of the clear button of the selection bar; pass a translation.",
    selectAllLabel:
      "string (optional, default 'Select all') - the accessible name of the header checkbox; pass a translation.",
    selectRowLabel:
      "string (optional, default 'Select row') - the accessible name of each row checkbox; pass a translation.",
    selectedCountLabel:
      '(count: number) => string (optional, default (count) => `${count} selected`) - the selection bar text; pass a translation.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'header text on highlight elevation',
        fg: '--text-default-primary',
        bg: '--bg-elevation-highlight',
        minRatio: 4.5,
      },
      {
        id: 'cell text on default elevation',
        fg: '--text-default-primary',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
    ],
    notes:
      'Native table semantics: th are columnheader, tr are row, td are cell. Every icon button (previous, next, table menu, column menu, clear selection) is named by its label prop, the header checkbox by selectAllLabel (tri-state: checked, indeterminate, unchecked) and each row checkbox by selectRowLabel. The current page size and the visible columns carry aria-current in the table menu. The drag handle is a focusable button wired to the dnd-kit keyboard sensor without sortable coordinates, so the arrow keys move a picked-up column by pixels rather than one slot at a time: column reordering is not yet keyboard-operable in practice, and the handle has no accessible name. The column menu and the drag handle are only visible on hover of the header or when they have focus.',
  },
};
