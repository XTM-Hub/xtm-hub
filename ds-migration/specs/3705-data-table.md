---
key: 3705-data-table
issue: 3705
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [DataTable, DataTableHeadBarOptions, DataTableOptionsHeader, DatatableI18nKey, ColumnDefWithOptionsHeader, SelectionState, useRowSelection, createDefaultSelectionColumn, DataTableSelectionHandlers, DataTableSelectionConfig, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow]
target_module: "@/components/ui/data-table"
target_symbols: [DataTable, DataTableHeadBarOptions, SelectionState, useRowSelection]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/DataTable.tsx, apps/frontend/src/components/filigran-ui/components/clients/Table.tsx]
---

# DataTable → `@/components/ui/data-table`, rebuilt on TanStack Table, dnd-kit and the design system `Checkbox`, `IconButton`, `Menu`, `Icon` and tokens

## Intent

The design system ships no table. The legacy `DataTable` (`@tanstack/react-table` + `@dnd-kit`, already on the design
system `Checkbox`, `IconButton` and `Menu`, laid out by the legacy `Table.tsx` parts on legacy theme classes) renders
22 tables in 21 files: every admin list, the trial lists, the service and subscription access lists and the document
lists in list mode. It is rebuilt as a candidate in `src/components/ui/data-table/` on the same engines, design system
parts, `Icon` and tokens. What users get stays: the toolbar with the range counter, previous / next and the table menu
(reset, columns, rows per page), header click and header menu sorting, column hiding, drag to reorder, drag to resize,
the selection column and its header bar, row click, loading rows, greyed rows that cannot be selected. Changed on
purpose (team feedback on #3715): the header row sits on a design system surface that stands out from the page in both
themes.

## The component

`src/components/ui/data-table/`, the package layout:

- `DataTable.tsx` (`'use client'`), classes merged with the app's `cn` (`@/lib/utils`):
  - `DataTable<TData extends { id: string }, TValue>`: props `columns: ColumnDef<TData, TValue>[]`, `data`, `toolbar?`,
    `tableState?: Partial<TableState>`, `tableOptions?: Partial<TableOptions<TData>>`, `onClickRow?`, `isLoading?`,
    `onResetTable?`, `selectionOptions?: { selectionState?: { state, onSelectionChange }, selectionHeader?: { actions? } }`
    and the label props below. Same `useReactTable` options as the legacy (`columnResizeMode: 'onChange'`,
    `getRowId: (row) => row.id`, `defaultColumn.minSize: -1`, `state: { columnOrder, ...tableState }`,
    `...tableOptions` last), same `DndContext` (closest centre, horizontal axis, mouse / touch / keyboard sensors,
    `useId` id) and `arrayMove` on drop. With `selectionOptions`, the `select` column is prepended and pinned left
    **without mutating** the caller's `columns` or `tableState` (a memoised `[selectColumn, ...columns]` and a new
    `columnPinning`); `columnOrder` starts from those ids.
  - Label props, the design system convention (`previousMonthLabel`), English defaults equal to the legacy strings:
    `previousPageLabel` ("Go to previous page"), `nextPageLabel` ("Go to next page"), `manageColumnsLabel` ("Manage
    columns visibility"), `resetTableLabel` ("Reset table"), `columnsLabel` ("Columns"), `rowsPerPageLabel` ("Rows per
    page"), `columnOptionsLabel` ("Column options"), `sortAscendingLabel` ("Asc"), `sortDescendingLabel` ("Desc"),
    `hideColumnLabel` ("Hide"), `clearSelectionLabel` ("Clear selection"), `selectAllLabel` ("Select all"),
    `selectRowLabel` ("Select row"), `selectedCountLabel?: (count: number) => string` (``(count) => `${count}
    selected` ``). They reach the inner parts through the internal context, as `t_i18n` did.
  - Toolbar: `toolbar` when given (a `<></>` still hides it), else `div.flex.items-center.justify-end` >
    `DataTableHeadBarOptions`.
  - `DataTableHeadBarOptions` (exported, read from context): an `inline-flex h-9 shrink-0 items-center rounded-sm border
    border-elevation-default` box holding `IconButton priority="tertiary"` previous (`<Icon name="chevron-left"
    size={16} />`), the counter (`px-2 content-compact text-default-secondary`, range in `text-default-primary`, same
    arithmetic), next (`chevron-right`), and the table menu trigger (`table-properties`, `aria-label={manageColumnsLabel}`).
    The menu keeps 3558's shape: reset item (`table.reset()` then `onResetTable`), Columns sub-menu (`selected` rows,
    `span.capitalize` on `column.id`), Rows per page sub-menu (50, 100, 200, 300, 500, `selected` on the current).
    No class on any `IconButton`.
  - Header cell, native `th` (dnd-kit needs the node): `relative group whitespace-nowrap truncate px-4 h-12 text-left
    align-middle bg-elevation-highlight content-compact-bold text-default-primary`, the legacy width / min-width from
    `header.getSize()` (unless -1) and the drag transform. Inside: the drag handle (native `button`, hidden until
    hover or focus, `Icon grip-vertical size={16}`, not on pinned columns), the label `span` that toggles sorting on
    click, the sort `Icon` (`chevron-up` / `chevron-down`, size 16, `text-icon-default`), the column menu (shown on
    hover: `IconButton priority="tertiary" size="sm"` `ellipsis-vertical`, `aria-label={columnOptionsLabel}`, items Asc
    / Desc with `startIcon` `chevron-up` / `chevron-down`, separator when both sort and hide apply, Hide with `eye-off`;
    absent when the column can neither sort nor hide), and the resize handle (`bg-filigran-brand-primary` 2px bar,
    shown on hover or while resizing, double click resets).
  - Body: `isLoading` renders 30 rows of `Skeleton` (`@/components/ui/skeleton`, `h-4 w-full`) per visible column;
    else one `tr` per row (`border-b border-elevation-subtle`, none on the last row), `hover:bg-elevation-hover` and
    `cursor-pointer` when `onClickRow`, on rows that can be selected; rows that cannot get `cursor-auto opacity-50` and
    ignore clicks, as in the legacy. Cells `td` `h-12 px-4 align-middle truncate content-compact text-default-primary`,
    width and max-width from `column.getSize()`, the drag transform.
  - Selection: `useRowSelection(state, setState)` exported unchanged (same handlers, same `selectAll` / `excludedIds` /
    `selectedIds` model); the internal select column (`id: 'select'`, size 40, no sort / hide / resize) renders the
    design system `Checkbox` (header tri-state `aria-label={selectAllLabel}`, cell `aria-label={selectRowLabel}` and
    `onClick` `stopPropagation`). The selection bar, rendered when `selectionOptions` is set, collapses to `h-0
    overflow-hidden` with nothing selected; otherwise `h-12 mt-4 mb-2 pl-4 bg-elevation-hover` with
    `selectedCountLabel(count)` (`content-compact lowercase`), a `size="sm"` tertiary `IconButton` `x`
    (`aria-label={clearSelectionLabel}`) and the caller's `actions({ selectionState })` at the end.
  - Dropped, no caller: `sticky`, `ref` / `fixedForwardRef`, `optionsHeader` (and `ColumnDefWithOptionsHeader`),
    `DataTableOptionsHeader`'s `menuItems`, `selectionOptions.createSelectionColumn`, `.totalSelectableCount`,
    `.handlers`, `.selectionHeader.custom`, the `i18nKey` map and its unused first / last page keys, the legacy
    `Table*` wrappers with `TableCaption` / `TableFooter`, and the dead `twp` / `transition-width` classes.
- `DataTable.meta.ts`: `DataTableMeta`, typed `ComponentMeta` (type import only), on the model of `Carousel.meta.ts`:
  description (toolbar, header surface, sort, hide, reorder, resize, selection bar, loading rows), `status: 'beta'`,
  `category: 'data-display'`, `version: '0.1.0'`, `radixPrimitive: 'none'`, variants `default`, `selectable`,
  `loading`, examples (a sortable list with `onClickRow`; a selectable list with actions; translated labels), `props`,
  and `accessibility` with `wcagStatus: 'pending'`, the contrast pairs `--text-default-primary` on
  `--bg-elevation-highlight` (header) and on `--bg-elevation-default` (cells) at 4.5, and notes: native `table`
  semantics (`columnheader`, `row`, `cell`), every icon button named by a label prop, checkboxes named, the header menu
  and drag handle only visible on hover or focus.
- `DataTable.test.tsx` (real TanStack and dnd-kit, `testRender`): header and cell texts; a click on a sortable header
  toggles `getIsSorted` (sort icon shown); `onClickRow` fires on a row and not on a row whose `enableRowSelection`
  returns false (that row has `opacity-50`); `isLoading` renders 30 skeleton rows; default toolbar range text and
  previous / next disabled at the bounds, next calls `onPaginationChange`; custom labels name every control; the table
  menu's Reset calls `onResetTable`, Columns lists hideable ids with `aria-current`, a rows-per-page pick sets the size;
  the column menu Asc / Desc / Hide; selection: the select column is prepended once across re-renders and the caller's
  `columns` array is untouched, header checkbox tri-state, a row checkbox click does not trigger `onClickRow`, the bar
  shows `selectedCountLabel(1)`, the clear button empties it, `actions` gets the state; `useRowSelection` handlers in
  `selectAll` and explicit modes (`renderHook`).
- `index.ts`: exports `DataTable`, `DataTableHeadBarOptions`, `useRowSelection` and the types `DataTableProps`,
  `DataTableLabels`, `SelectionState`, never the meta.
- `src/utils/design-system/data-table.ts`: `getDataTableLabels(t)` returns the thirteen string labels and
  `selectedCountLabel: (count) => t('DesignSystem.DataTable.SelectedCount', { count })`, on the model of
  `getDatePickerLabels`; `data-table.test.ts` checks the keys. Replaces `src/utils/datatable.tsx` (deleted).

## Props mapping

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `import { DataTable[, DataTableHeadBarOptions][, SelectionState][, useRowSelection] } from '@filigran/ui'` | same names from `@/components/ui/data-table` | 21 files, plus `use-pending-user-actions.ts` and `manage-users/client-section.tsx` (`SelectionState` only) |
| `i18nKey={i18nKey(t)}` (`@/utils/datatable`) | `{...getDataTableLabels(t)}` (`@/utils/design-system/data-table`) | 18 instances |
| No `i18nKey` (`SubscriptionSlug`, `DocumentList`, `PublicShareableDocumentList`, `TrialsTabQuotasPlatform`) | `{...getDataTableLabels(t)}` added, `t` from `useTranslate()` where the file has none | 4 |
| `toolbar`, `tableState`, `tableOptions`, `onClickRow`, `isLoading`, `onResetTable`, `columns`, `data`, `selectionOptions={{ selectionState, selectionHeader: { actions } }}` | unchanged | all |
| `<DataTableHeadBarOptions />` in a toolbar | unchanged | 11 toolbars (4 more tables get it from the default toolbar) |

No call site passes `ref`, `sticky`, `optionsHeader` or the dropped selection options. The document lists keep their
wrapper `DOCUMENT_LIST_TABLE_CLASS_NAME` (`[&_th]:bg-transparent [&_th]:content-compact-bold`) unchanged.

## Files in scope

- `apps/frontend/src/components/ui/data-table/DataTable.tsx`, `DataTable.meta.ts`, `DataTable.test.tsx`, `index.ts` (new)
- `apps/frontend/src/utils/design-system/data-table.ts`, `data-table.test.ts` (new); delete `apps/frontend/src/utils/datatable.tsx`
- Call sites: `subcription/[slug]/SubscriptionSlug.tsx`, `service/[slug]/ServiceSlug.tsx`, `subcription/saas/SaasList.tsx`,
  `competitor/CompetitorList.tsx`, `ui/shareable-resource/PublicShareableDocumentList.tsx`,
  `service/components/DocumentList.tsx`, `trials/tab/quotas/TrialsTabQuotasPlatform.tsx`, `trials/tab/TrialsTab.tsx`,
  `service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialTable.tsx`, `service/AdminServiceTab.tsx`,
  `admin/solution-category/SolutionCategories.tsx`, `admin/news-feed/NewsFeedList.tsx`,
  `organization/[slug]/subscribed-services/OrganizationSubscribedServices.tsx`, `organization/OrganizationList.tsx`,
  `admin/voting-round/VotingRounds.tsx`, `admin/voting-round/VotingRoundDetail.tsx`,
  `admin/role/SsoGroupRolePortalList.tsx`, `admin/role/RolePortalCapabilitiesList.tsx`, `admin/use-case/UseCases.tsx`,
  `admin/user/pending-user/PendingUserList.tsx`, `admin/user/pending-user/use-pending-user-actions.ts`,
  `admin/user/UserList.tsx` (all under `apps/frontend/src/components/`), and
  `apps/frontend/app/(application)/app/(user)/service/xtm-platform-trial/[serviceInstanceId]/manage-users/client-section.tsx`
- Tests whose module mock targets `@filigran/ui` for these symbols move it to `@/components/ui/data-table`, nothing
  else changes: `OrganizationSubscribedServices.test.tsx`, `TrialsTab.test.tsx`, `TrialsTabQuotasPlatform.test.tsx`,
  `ManageTrialTable.test.tsx`, `UserList.test.tsx`, `PendingUserList.test.tsx`, `use-pending-user-actions.test.ts`.
  `NewsFeedList.test.tsx:253` reads `DesignSystem.DataTable.NextPage` instead of `Datatable.GoNextPage`;
  `DocumentList.test.tsx:164` checks `DesignSystem.DataTable.ManageColumns` is absent instead of the English name.
- `apps/frontend/messages/en.json`, `fr.json`, `ja.json`: the root `Datatable` object goes; `DesignSystem.DataTable`
  comes (see Accessibility and i18n).
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts`: keeps `export * from './Form'` only.
- Delete `apps/frontend/src/components/filigran-ui/components/clients/DataTable.tsx` and `Table.tsx`.

No e2e locator changes: the page models and specs find `row` / `cell` by their text content, `td:last-child` buttons
and the "Name" header text (`service.pageModel.ts:28`), all kept; the select column keeps "Select row" in English, so
`capabilities.spec.ts:64`'s row name still matches.

## Screens

The users list shows the toolbar, the sort icon and the development admin's own row greyed; the use cases list is the
page of the team feedback; the user requests tab (four seeded pending users) shows the selection column and, after one
pick, the selection bar with its reject / approve actions. The service access lists of the seed have no subscriber.

```json
[
  {
    "name": "admin-users",
    "path": "/app/admin/user",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "role=columnheader >> nth=1" }
    ],
    "clip": "main"
  },
  {
    "name": "use-cases",
    "path": "/app/admin/use-case",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "role=row >> nth=1" }
    ],
    "clip": "main"
  },
  {
    "name": "pending-users-selection",
    "path": "/app/manage/user?pendingUsers",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=checkbox[name=\"Select row\"]" },
      { "waitFor": "text=1 selected" }
    ],
    "clip": "main"
  }
]
```

## Out of scope

- The sibling pagination controls (`src/components/ui/pagination/*`), which draw the same counter box.
- The toolbars' content (search fields, filters, buttons), the column definitions and their cells.
- The document lists' wrapper class that makes their header transparent (see To validate).
- `@tanstack/react-table` and `@dnd-kit/*` in `package.json`; the root `"Reset table"` / `"Rows per page"` keys.

## Accessibility and i18n

- Kept: native `table` / `columnheader` / `row` / `cell`, the checkboxes' names and tri-state, `aria-current` on the
  current page size and visible columns, every icon button's name, the keyboard sensor of the column drag.
- Moved: the `Datatable` keys go to `DesignSystem.DataTable` (`PreviousPage`, `NextPage`, `ManageColumns`,
  `ResetTable`, `Columns`, `RowsPerPage`, `ColumnOptions`, `SortAscending`, `SortDescending`, `HideColumn`,
  `ClearSelection`), keeping their en and fr texts; ja `SortAscending` / `SortDescending` become "昇順" / "降順" (the
  legacy "として" / "Des" were wrong). `GoFirstPage` / `GoLastPage` go (unused).
- Added in en, fr, ja: `SelectAll` ("Select all" / "Tout sélectionner" / "すべて選択"), `SelectRow` ("Select row" /
  "Sélectionner la ligne" / "行を選択"), `SelectedCount` ("{count} selected" / "{count} sélectionné(s)" / "{count} 件選択").
  English names stay the legacy ones.
- Changed: four tables that showed English control names (subscription access, both document lists, trial quotas) now
  show translated ones.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/data-table src/utils src/components/admin src/components/organization src/components/subcription src/components/service src/components/trials src/components/competitor src/components/ui/shareable-resource src/components/filigran-ui "app/(application)/app/(user)/service"`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3705-data-table.md`

## Decisions

- **Header on `bg-elevation-highlight`** (team feedback on #3715, and the `MarkdownRenderer` table header of 3702: one
  answer for both tables). `bg-elevation-heading` was ruled out: at layer 0 it equals the page background in both
  themes, the very defect reported.
- **Same engines**: TanStack Table and dnd-kit stay; the candidate replaces the layout and the legacy theme classes.
- **Native `th` / `td` with typography utilities** rather than `Text as="th"`: dnd-kit and the column sizing need the
  cell node and its inline style; `content-compact-bold` / `content-compact` are the design system's utilities.
- **Icons through `Icon`** from `icon-mapping.json`: `table_tune` → `table-properties`, `more_vert` →
  `ellipsis-vertical`, `drag_indicator` → `grip-vertical`, `visibility_off` → `eye-off`, `keyboard_arrow_up` / `down` →
  `chevron-up` / `down`, `close` → `x`; the custom previous / next arrows take `chevron-left` / `right` as the Carousel
  candidate. `@filigran/icon` leaves the component.
- **`IconButton` without overrides**: the legacy `h-9 w-9 rounded-none`, `w-6`, `h-5 w-5` go; toolbar buttons keep the
  default `md` (36px, the legacy size), the header menu and clear buttons take `sm` (24px).
- **Labels as props with a `getDataTableLabels(t)` helper** (the 3545 rule: every control name with a prop goes through
  the `DesignSystem` namespace; the 3541 and 3558 deferrals of the hard-coded "Select all", "Select row" and "N
  selected"). Admin overrides saved on the old `Datatable.*` keys through in-context editing no longer apply.
- **No prop mutation**: the legacy `columns.unshift` on every render stacks `select` columns when the caller memoises
  `columns` (`SubscriptionSlug`, `ManageTrialTable`, `PendingUserList`); a component proposed upstream cannot mutate
  its props.
- **Unused options dropped**, as the Carousel and Accordion candidates did.

## To validate

- Header row on `bg-elevation-highlight` with `content-compact-bold`, cells in `content-compact`, rows separated by
  `border-elevation-subtle`. Alternative: `content-base` as the `MarkdownRenderer` table.
- The document lists keep their transparent header through their own wrapper class. Alternative: drop the class so
  every table header takes the surface.
- Rows that cannot be selected stay at 50% opacity. Alternative: `bg-elevation-disabled` with `text-default-disabled`.
- The selection bar takes `bg-elevation-hover` (the legacy hover colour at half opacity). Alternative:
  `bg-elevation-highlight`, the header surface.
- Toolbar box border `border-elevation-default` with `rounded-sm`. Alternative: `border-elevation-subtle`.
- Previous / next take `chevron-left` / `chevron-right` (16px) instead of the legacy 12px arrows.
- `category: 'data-display'` in the meta.

## Deferred findings

- The column drag handle is an unnamed `button` (icon only), and column reordering has no announced instructions.
- The header menu and drag handle appear on hover only; keyboard users reach them by Tab but cannot see the column
  menu until it has focus.
- Rows clickable through `onClickRow` are `tr` with a click handler: no focus, no key handler, no link semantics.
- `DataTableHeadBarOptions` and `src/components/ui/pagination/PaginationControls` draw the same counter box twice.
- The Columns sub-menu lists raw `column.id`s (`first_name`, `select` excluded) instead of the header labels.
- `getSelectionCount` counts the current page when `selectAll` is on, so "N selected" understates a select-all across
  pages, while the pending users' bulk approve and reject act on every match (the dropped `totalSelectableCount` had no
  caller), and neither confirm dialog shows a count.
- `isAllSelected` / `isSomeSelected` compare the selected ids with the current page only, so the header checkbox state is
  wrong once a manual-pagination selection spans pages.
- Rows that cannot be selected still render an enabled checkbox (no `disabled`); `toggleRow` ignores the click.
- The collapsed selection bar (`h-0 overflow-hidden`) keeps "Clear selection" and the caller's actions focusable and
  announces "0 selected".
- Header cells carry no `aria-sort`: the sort state is only the chevron.
- The icon-only `IconButton`s (previous, next, table menu, column menu, clear selection) have no `Tooltip`, which the
  `IconButton` usage contract asks for.
- `truncate` on `th` / `td` clips the focus ring of the column menu and of row action buttons.
- The column menu trigger can fade back to hidden while its menu is open and the pointer has left the header.
- Every body cell has its own `SortableContext` and `useSortable`, and resizing re-renders every cell per mouse move:
  about 4,000 subscribers at 500 rows per page.
- "Reset table" does not restore the column order after a drag on tables that do not control `columnOrder` themselves:
  the order is passed as controlled state and `table.reset()` never calls `setColumnOrder` (as in the legacy).
- `useRowSelection` is exported but its return type `DataTableSelectionHandlers` is not.
- fr `SelectedCount` uses "(s)" where other fr keys use ICU plurals; the bar also lowercases the translated text.
- Instruction drift for `hub-review`: `.claude/rules/frontend.md` still says "Icons: `@filigran/icon`", while the
  candidates use the design system `Icon`.
