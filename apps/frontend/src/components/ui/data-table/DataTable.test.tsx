import testRender from '@/utils/test/test-render';
import type {
  ColumnDef,
  PaginationState,
  Row,
  SortingState,
  Table,
  TableState,
  Updater,
} from '@tanstack/react-table';
import { act, renderHook, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  DataTable,
  useRowSelection,
  type DataTableLabels,
  type DataTableProps,
  type SelectionState,
} from './DataTable';

interface Person {
  id: string;
  name: string;
  email: string;
}

type User = ReturnType<typeof testRender>['user'];

const ALICE: Person = {
  id: 'alice',
  name: 'Alice',
  email: 'alice@filigran.io',
};
const BOB: Person = { id: 'bob', name: 'Bob', email: 'bob@filigran.io' };
const PEOPLE = [ALICE, BOB];
const NAME_COLUMN_ID = 'name';
const EMAIL_COLUMN_ID = 'email';
const NAME_HEADER = 'Name';
const EMAIL_HEADER = 'Email';
const COLUMNS: ColumnDef<Person>[] = [
  { id: NAME_COLUMN_ID, accessorKey: 'name', header: NAME_HEADER },
  { id: EMAIL_COLUMN_ID, accessorKey: 'email', header: EMAIL_HEADER },
];
const SELECT_COLUMN_ID = 'select';
const SELECT_HEADER = '';
const ACTIONS_COLUMN_ID = 'actions';
const ACTIONS_HEADER = 'Actions';
const LOADING_ROW_COUNT = 30;
const ROW_COUNT = 120;
const PAGE_SIZE = 50;
const NEW_PAGE_SIZE = 100;
const DISABLED_ROW_CLASS = 'opacity-50';
const COLLAPSED_BAR_CLASS = 'h-0';

const DEFAULT_LABELS = {
  previousPage: 'Go to previous page',
  nextPage: 'Go to next page',
  manageColumns: 'Manage columns visibility',
  resetTable: 'Reset table',
  columns: 'Columns',
  rowsPerPage: 'Rows per page',
  columnOptions: 'Column options',
  sortAscending: 'Asc',
  sortDescending: 'Desc',
  hideColumn: 'Hide',
  clearSelection: 'Clear selection',
  selectAll: 'Select all',
  selectRow: 'Select row',
};
const defaultSelectedCount = (count: number) => `${count} selected`;

const CUSTOM_LABELS: Required<DataTableLabels> = {
  previousPageLabel: 'Page précédente',
  nextPageLabel: 'Page suivante',
  manageColumnsLabel: 'Gérer les colonnes',
  resetTableLabel: 'Réinitialiser',
  columnsLabel: 'Colonnes',
  rowsPerPageLabel: 'Lignes par page',
  columnOptionsLabel: 'Options de colonne',
  sortAscendingLabel: 'Croissant',
  sortDescendingLabel: 'Décroissant',
  hideColumnLabel: 'Cacher',
  clearSelectionLabel: 'Effacer la sélection',
  selectAllLabel: 'Tout sélectionner',
  selectRowLabel: 'Sélectionner la ligne',
  selectedCountLabel: (count) => `${count} sélectionné(s)`,
};

const emptySelection = (): SelectionState => ({
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
});

const aliceSelected = (): SelectionState => ({
  ...emptySelection(),
  selectedIds: new Set([ALICE.id]),
});

const renderTable = (props: Partial<DataTableProps<Person, unknown>> = {}) =>
  testRender(
    <DataTable
      columns={COLUMNS}
      data={PEOPLE}
      {...props}
    />
  );

const paginated = ({
  pageIndex = 0,
  rowCount = ROW_COUNT,
  onPaginationChange = vi.fn(),
} = {}): Partial<DataTableProps<Person, unknown>> => ({
  tableState: { pagination: { pageIndex, pageSize: PAGE_SIZE } },
  tableOptions: { manualPagination: true, rowCount, onPaginationChange },
});

const withSelection = (
  state: SelectionState
): Partial<DataTableProps<Person, unknown>> => ({
  selectionOptions: {
    selectionState: { state, onSelectionChange: vi.fn() },
  },
});

const applyUpdater = <T,>(updater: Updater<T> | undefined, previous: T) =>
  typeof updater === 'function'
    ? (updater as (old: T) => T)(previous)
    : updater;

const getRowOf = (text: string) => screen.getByText(text).closest('tr')!;

const getBodyRows = () =>
  within(screen.getAllByRole('rowgroup')[1]).queryAllByRole('row');

const getHeaderTexts = () =>
  screen.getAllByRole('columnheader').map((header) => header.textContent);

const getRowCheckbox = (text: string) =>
  within(getRowOf(text)).getByRole('checkbox', {
    name: DEFAULT_LABELS.selectRow,
  });

const openTableMenu = (user: User) =>
  user.click(
    screen.getByRole('button', { name: DEFAULT_LABELS.manageColumns })
  );

const openColumnMenu = (user: User, columnIndex: number) =>
  user.click(
    screen.getAllByRole('button', { name: DEFAULT_LABELS.columnOptions })[
      columnIndex
    ]
  );

const pickMenuItem = async (user: User, name: string) =>
  user.click(await screen.findByRole('menuitem', { name }));

// A pointer move off the sub-menu trigger closes the sub-menu in jsdom, so its items are picked with the keyboard.
const pickSubMenuItem = async (user: User, name: string) => {
  const item = await screen.findByRole('menuitem', { name });
  act(() => item.focus());
  await user.keyboard('{Enter}');
};

describe('DataTable', () => {
  it('should render the header texts when given columns', () => {
    // Given / When
    renderTable();

    // Then
    expect(getHeaderTexts()).toEqual([NAME_HEADER, EMAIL_HEADER]);
  });

  it('should render the cell texts when given data', () => {
    // Given / When
    renderTable();

    // Then
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(
      [ALICE.name, ALICE.email, BOB.name, BOB.email]
    );
  });

  it.each([
    { from: 'unsorted', sorting: [], desc: false },
    {
      from: 'ascending',
      sorting: [{ id: NAME_COLUMN_ID, desc: false }],
      desc: true,
    },
  ])(
    'should sort with desc $desc when the header label of a $from column is clicked',
    async ({ sorting, desc }) => {
      // Given
      const onSortingChange = vi.fn();
      const { user } = renderTable({
        tableState: { sorting },
        tableOptions: { onSortingChange },
      });

      // When
      await user.click(screen.getByText(NAME_HEADER));

      // Then
      expect(
        applyUpdater<SortingState>(onSortingChange.mock.lastCall?.[0], sorting)
      ).toEqual([{ id: NAME_COLUMN_ID, desc }]);
    }
  );

  it.each([
    { direction: 'ascending', desc: false, icon: 'lucide-chevron-up' },
    { direction: 'descending', desc: true, icon: 'lucide-chevron-down' },
  ])(
    'should show the $icon sort icon in the header when the column is sorted $direction',
    ({ desc, icon }) => {
      // Given / When
      renderTable({ tableState: { sorting: [{ id: NAME_COLUMN_ID, desc }] } });

      // Then
      expect(screen.getByText(NAME_HEADER).querySelector('svg')).toHaveClass(
        icon
      );
    }
  );

  it.each([
    { person: ALICE, calls: 1 },
    { person: BOB, calls: 0 },
  ])(
    'should call onClickRow $calls time(s) when the row of $person.name is clicked and only Alice can be selected',
    async ({ person, calls }) => {
      // Given
      const onClickRow = vi.fn();
      const { user } = renderTable({
        onClickRow,
        tableOptions: {
          enableRowSelection: (row) => row.original.id !== BOB.id,
        },
      });

      // When
      await user.click(getRowOf(person.name));

      // Then
      expect(onClickRow).toHaveBeenCalledTimes(calls);
    }
  );

  it('should grey a row that cannot be selected', () => {
    // Given / When
    renderTable({
      tableOptions: {
        enableRowSelection: (row) => row.original.id !== BOB.id,
      },
    });

    // Then
    expect(getRowOf(BOB.name)).toHaveClass(DISABLED_ROW_CLASS);
  });

  it('should render thirty skeleton rows when loading', () => {
    // Given / When
    renderTable({ isLoading: true });

    // Then
    expect(getBodyRows()).toHaveLength(LOADING_ROW_COUNT);
  });

  it('should render no toolbar when given an empty one', () => {
    // Given / When
    renderTable({ toolbar: <></> });

    // Then
    expect(
      screen.queryByRole('button', { name: DEFAULT_LABELS.previousPage })
    ).not.toBeInTheDocument();
  });

  describe('pagination', () => {
    const PAGES = [
      {
        pageIndex: 0,
        rowCount: ROW_COUNT,
        range: '1 - 50',
        previousDisabled: true,
        nextDisabled: false,
      },
      {
        pageIndex: 1,
        rowCount: ROW_COUNT,
        range: '51 - 100',
        previousDisabled: false,
        nextDisabled: false,
      },
      {
        pageIndex: 2,
        rowCount: ROW_COUNT,
        range: '101 - 120',
        previousDisabled: false,
        nextDisabled: true,
      },
      {
        pageIndex: 0,
        rowCount: 0,
        range: '0 - 0',
        previousDisabled: true,
        nextDisabled: true,
      },
    ];

    it.each(PAGES)(
      'should show "$range / $rowCount" when on page $pageIndex of $rowCount rows',
      ({ pageIndex, rowCount, range }) => {
        // Given / When
        renderTable(paginated({ pageIndex, rowCount }));

        // Then
        expect(screen.getByText(range).parentElement).toHaveTextContent(
          `${range} / ${rowCount}`
        );
      }
    );

    it.each(PAGES)(
      'should disable previous ($previousDisabled) and next ($nextDisabled) when on page $pageIndex of $rowCount rows',
      ({ pageIndex, rowCount, previousDisabled, nextDisabled }) => {
        // Given / When
        renderTable(paginated({ pageIndex, rowCount }));

        // Then
        expect(
          [DEFAULT_LABELS.previousPage, DEFAULT_LABELS.nextPage].map((name) =>
            screen.getByRole('button', { name }).hasAttribute('disabled')
          )
        ).toEqual([previousDisabled, nextDisabled]);
      }
    );

    it.each([
      { button: DEFAULT_LABELS.previousPage, from: 1, to: 0 },
      { button: DEFAULT_LABELS.nextPage, from: 0, to: 1 },
    ])(
      'should ask for page $to when "$button" is clicked on page $from',
      async ({ button, from, to }) => {
        // Given
        const onPaginationChange = vi.fn();
        const { user } = renderTable(
          paginated({ pageIndex: from, onPaginationChange })
        );

        // When
        await user.click(screen.getByRole('button', { name: button }));

        // Then
        expect(
          applyUpdater<PaginationState>(onPaginationChange.mock.lastCall?.[0], {
            pageIndex: from,
            pageSize: PAGE_SIZE,
          })
        ).toEqual({ pageIndex: to, pageSize: PAGE_SIZE });
      }
    );
  });

  describe('labels', () => {
    it.each([
      { role: 'button', name: CUSTOM_LABELS.previousPageLabel },
      { role: 'button', name: CUSTOM_LABELS.nextPageLabel },
      { role: 'button', name: CUSTOM_LABELS.manageColumnsLabel },
      { role: 'button', name: CUSTOM_LABELS.columnOptionsLabel },
      { role: 'button', name: CUSTOM_LABELS.clearSelectionLabel },
      { role: 'checkbox', name: CUSTOM_LABELS.selectAllLabel },
      { role: 'checkbox', name: CUSTOM_LABELS.selectRowLabel },
    ])(
      'should name a $role "$name" when the label is given',
      ({ role, name }) => {
        // Given / When
        renderTable({ ...CUSTOM_LABELS, ...withSelection(aliceSelected()) });

        // Then
        expect(screen.getAllByRole(role, { name })[0]).toBeInTheDocument();
      }
    );

    it('should write the selected count with the label when it is given', () => {
      // Given / When
      renderTable({ ...CUSTOM_LABELS, ...withSelection(aliceSelected()) });

      // Then
      expect(
        screen.getByText(CUSTOM_LABELS.selectedCountLabel(1))
      ).toBeInTheDocument();
    });

    it.each([
      {
        trigger: CUSTOM_LABELS.manageColumnsLabel,
        item: CUSTOM_LABELS.resetTableLabel,
      },
      {
        trigger: CUSTOM_LABELS.manageColumnsLabel,
        item: CUSTOM_LABELS.columnsLabel,
      },
      {
        trigger: CUSTOM_LABELS.manageColumnsLabel,
        item: CUSTOM_LABELS.rowsPerPageLabel,
      },
      {
        trigger: CUSTOM_LABELS.columnOptionsLabel,
        item: CUSTOM_LABELS.sortAscendingLabel,
      },
      {
        trigger: CUSTOM_LABELS.columnOptionsLabel,
        item: CUSTOM_LABELS.sortDescendingLabel,
      },
      {
        trigger: CUSTOM_LABELS.columnOptionsLabel,
        item: CUSTOM_LABELS.hideColumnLabel,
      },
    ])(
      'should name the "$item" item of the "$trigger" menu when the label is given',
      async ({ trigger, item }) => {
        // Given
        const { user } = renderTable(CUSTOM_LABELS);

        // When
        await user.click(screen.getAllByRole('button', { name: trigger })[0]);

        // Then
        expect(
          await screen.findByRole('menuitem', { name: item })
        ).toBeInTheDocument();
      }
    );
  });

  describe('table menu', () => {
    it('should call onResetTable when Reset is picked', async () => {
      // Given
      const onResetTable = vi.fn();
      const { user } = renderTable({ onResetTable });
      await openTableMenu(user);

      // When
      await pickMenuItem(user, DEFAULT_LABELS.resetTable);

      // Then
      expect(onResetTable).toHaveBeenCalledTimes(1);
    });

    it('should bring a hidden column back when Reset is picked', async () => {
      // Given
      const { user } = renderTable();
      await openColumnMenu(user, 1);
      await pickMenuItem(user, DEFAULT_LABELS.hideColumn);
      await openTableMenu(user);

      // When
      await pickMenuItem(user, DEFAULT_LABELS.resetTable);

      // Then
      expect(getHeaderTexts()).toEqual([NAME_HEADER, EMAIL_HEADER]);
    });

    it('should mark only the visible columns as current in the Columns sub-menu', async () => {
      // Given
      const { user } = renderTable({
        tableState: { columnVisibility: { [EMAIL_COLUMN_ID]: false } },
      });
      await openTableMenu(user);

      // When
      await pickMenuItem(user, DEFAULT_LABELS.columns);

      // Then
      await screen.findByRole('menuitem', { name: EMAIL_COLUMN_ID });
      expect(
        screen
          .getAllByRole('menuitem')
          .filter((item) => item.getAttribute('aria-current') === 'true')
          .map((item) => item.textContent)
      ).toEqual([NAME_COLUMN_ID]);
    });

    it('should not list the select column in the Columns sub-menu', async () => {
      // Given
      const { user } = renderTable({ selectionOptions: {} });
      await openTableMenu(user);

      // When
      await pickMenuItem(user, DEFAULT_LABELS.columns);

      // Then
      await screen.findByRole('menuitem', { name: EMAIL_COLUMN_ID });
      expect(
        screen.queryByRole('menuitem', { name: SELECT_COLUMN_ID })
      ).not.toBeInTheDocument();
    });

    it('should hide a column when it is picked in the Columns sub-menu', async () => {
      // Given
      const { user } = renderTable();
      await openTableMenu(user);
      await pickMenuItem(user, DEFAULT_LABELS.columns);

      // When
      await pickSubMenuItem(user, EMAIL_COLUMN_ID);

      // Then
      expect(getHeaderTexts()).toEqual([NAME_HEADER]);
    });

    it('should mark the current page size in the Rows per page sub-menu', async () => {
      // Given
      const { user } = renderTable(paginated());
      await openTableMenu(user);

      // When
      await pickMenuItem(user, DEFAULT_LABELS.rowsPerPage);

      // Then
      expect(
        await screen.findByRole('menuitem', { name: String(PAGE_SIZE) })
      ).toHaveAttribute('aria-current', 'true');
    });

    it('should set the page size when a rows-per-page value is picked', async () => {
      // Given
      const onPaginationChange = vi.fn();
      const { user } = renderTable(paginated({ onPaginationChange }));
      await openTableMenu(user);
      await pickMenuItem(user, DEFAULT_LABELS.rowsPerPage);

      // When
      await pickSubMenuItem(user, String(NEW_PAGE_SIZE));

      // Then
      expect(
        applyUpdater<PaginationState>(onPaginationChange.mock.lastCall?.[0], {
          pageIndex: 0,
          pageSize: PAGE_SIZE,
        })
      ).toEqual({ pageIndex: 0, pageSize: NEW_PAGE_SIZE });
    });
  });

  describe('column menu', () => {
    it.each([
      { item: DEFAULT_LABELS.sortAscending, desc: false },
      { item: DEFAULT_LABELS.sortDescending, desc: true },
    ])(
      'should sort the column with desc $desc when $item is picked',
      async ({ item, desc }) => {
        // Given
        const onSortingChange = vi.fn();
        const { user } = renderTable({
          tableState: { sorting: [] },
          tableOptions: { onSortingChange },
        });
        await openColumnMenu(user, 0);

        // When
        await pickMenuItem(user, item);

        // Then
        expect(
          applyUpdater<SortingState>(onSortingChange.mock.lastCall?.[0], [])
        ).toEqual([{ id: NAME_COLUMN_ID, desc }]);
      }
    );

    it('should hide the column when Hide is picked', async () => {
      // Given
      const { user } = renderTable();
      await openColumnMenu(user, 1);

      // When
      await pickMenuItem(user, DEFAULT_LABELS.hideColumn);

      // Then
      expect(getHeaderTexts()).toEqual([NAME_HEADER]);
    });

    it('should render no column menu when the column can neither sort nor hide', () => {
      // Given / When
      renderTable({
        columns: [
          {
            id: NAME_COLUMN_ID,
            accessorKey: 'name',
            header: NAME_HEADER,
            enableSorting: false,
            enableHiding: false,
          },
        ],
      });

      // Then
      expect(
        screen.queryByRole('button', { name: DEFAULT_LABELS.columnOptions })
      ).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should prepend the select column once when re-rendered', () => {
      // Given
      const { rerender } = renderTable({ selectionOptions: {} });

      // When
      rerender(
        <DataTable
          columns={COLUMNS}
          data={PEOPLE}
          selectionOptions={{}}
        />
      );

      // Then
      expect(getHeaderTexts()).toEqual([
        SELECT_HEADER,
        NAME_HEADER,
        EMAIL_HEADER,
      ]);
    });

    it('should leave the columns of the caller untouched when re-rendered', () => {
      // Given
      const columns = [...COLUMNS];
      const { rerender } = renderTable({ columns, selectionOptions: {} });

      // When
      rerender(
        <DataTable
          columns={columns}
          data={PEOPLE}
          selectionOptions={{}}
        />
      );

      // Then
      expect(columns).toEqual(COLUMNS);
    });

    it('should leave the column pinning of the caller untouched when it already pins select', () => {
      // Given
      const tableState: Partial<TableState> = {
        columnPinning: {
          left: [SELECT_COLUMN_ID, NAME_COLUMN_ID, SELECT_COLUMN_ID],
        },
      };
      const expected = structuredClone(tableState);

      // When
      renderTable({ tableState, selectionOptions: {} });

      // Then
      expect(tableState).toEqual(expected);
    });

    it('should render the select header once first and a right-pinned column last when the caller pins both sides', () => {
      // Given
      const columns: ColumnDef<Person>[] = [
        { id: ACTIONS_COLUMN_ID, header: ACTIONS_HEADER },
        ...COLUMNS,
      ];

      // When
      renderTable({
        columns,
        tableState: {
          columnPinning: {
            left: [SELECT_COLUMN_ID, SELECT_COLUMN_ID],
            right: [ACTIONS_COLUMN_ID],
          },
        },
        selectionOptions: {},
      });

      // Then
      expect(getHeaderTexts()).toEqual([
        SELECT_HEADER,
        NAME_HEADER,
        EMAIL_HEADER,
        ACTIONS_HEADER,
      ]);
    });

    it.each([
      {
        control: 'row checkbox',
        getControl: () => getRowCheckbox(ALICE.name),
        expected: aliceSelected(),
      },
      {
        control: 'header checkbox',
        getControl: () =>
          screen.getByRole('checkbox', { name: DEFAULT_LABELS.selectAll }),
        expected: { ...emptySelection(), selectAll: true },
      },
    ])(
      'should hand the new selection to onSelectionChange when the $control is clicked',
      async ({ getControl, expected }) => {
        // Given
        const onSelectionChange = vi.fn();
        const { user } = renderTable({
          selectionOptions: {
            selectionState: { state: emptySelection(), onSelectionChange },
          },
        });

        // When
        await user.click(getControl());

        // Then
        expect(
          applyUpdater<SelectionState>(
            onSelectionChange.mock.lastCall?.[0],
            emptySelection()
          )
        ).toEqual(expected);
      }
    );

    it.each([
      { description: 'no row', selectedIds: [], checked: 'false' },
      { description: 'one row', selectedIds: [ALICE.id], checked: 'mixed' },
      {
        description: 'every row',
        selectedIds: [ALICE.id, BOB.id],
        checked: 'true',
      },
    ])(
      'should set the header checkbox to $checked when $description is selected',
      ({ selectedIds, checked }) => {
        // Given / When
        renderTable(
          withSelection({
            ...emptySelection(),
            selectedIds: new Set(selectedIds),
          })
        );

        // Then
        expect(
          screen.getByRole('checkbox', { name: DEFAULT_LABELS.selectAll })
        ).toHaveAttribute('aria-checked', checked);
      }
    );

    it('should count every selectable row when the header checkbox is clicked', async () => {
      // Given
      const { user } = renderTable({ selectionOptions: {} });

      // When
      await user.click(
        screen.getByRole('checkbox', { name: DEFAULT_LABELS.selectAll })
      );

      // Then
      expect(
        screen.getByText(defaultSelectedCount(PEOPLE.length))
      ).toBeInTheDocument();
    });

    it('should not call onClickRow when a row checkbox is clicked', async () => {
      // Given
      const onClickRow = vi.fn();
      const { user } = renderTable({ onClickRow, selectionOptions: {} });

      // When
      await user.click(getRowCheckbox(ALICE.name));

      // Then
      expect(onClickRow).not.toHaveBeenCalled();
    });

    it('should show the count in the bar when a row checkbox is clicked', async () => {
      // Given
      const { user } = renderTable({ selectionOptions: {} });

      // When
      await user.click(getRowCheckbox(ALICE.name));

      // Then
      expect(screen.getByText(defaultSelectedCount(1))).toBeInTheDocument();
    });

    it('should collapse the bar when clear is clicked', async () => {
      // Given
      const { user } = renderTable({ selectionOptions: {} });
      await user.click(getRowCheckbox(ALICE.name));

      // When
      await user.click(
        screen.getByRole('button', { name: DEFAULT_LABELS.clearSelection })
      );

      // Then
      expect(
        screen.getByText(defaultSelectedCount(0)).parentElement?.parentElement
      ).toHaveClass(COLLAPSED_BAR_CLASS);
    });

    it('should hand the selection state to the actions when a row is selected', async () => {
      // Given
      const actions = vi.fn(() => null);
      const { user } = renderTable({
        selectionOptions: { selectionHeader: { actions } },
      });

      // When
      await user.click(getRowCheckbox(BOB.name));

      // Then
      expect(actions).toHaveBeenLastCalledWith({
        selectionState: { ...emptySelection(), selectedIds: new Set([BOB.id]) },
      });
    });
  });
});

describe('useRowSelection', () => {
  const fakeRow = (id: string, canSelect = true) =>
    ({ id, getCanSelect: () => canSelect }) as unknown as Row<Person>;
  const fakeTable = (rows: Row<Person>[]) =>
    ({ getRowModel: () => ({ rows }) }) as unknown as Table<Person>;
  const ALICE_ROW = fakeRow(ALICE.id);
  const BOB_ROW = fakeRow(BOB.id);
  const LOCKED_ROW = fakeRow('locked', false);
  const TABLE = fakeTable([ALICE_ROW, BOB_ROW, LOCKED_ROW]);
  const LOCKED_TABLE = fakeTable([LOCKED_ROW]);
  const TOTAL_COUNT = 10;

  const explicit = (...ids: string[]): SelectionState => ({
    ...emptySelection(),
    selectedIds: new Set(ids),
  });
  const allBut = (...ids: string[]): SelectionState => ({
    ...emptySelection(),
    selectAll: true,
    excludedIds: new Set(ids),
  });

  const renderHandlers = (state: SelectionState) =>
    renderHook(() => useRowSelection<Person>(state, vi.fn())).result.current;

  const renderSelection = (initial: SelectionState) =>
    renderHook(() => {
      const [state, setState] = useState(initial);
      return { state, handlers: useRowSelection<Person>(state, setState) };
    });

  it.each([
    {
      mode: 'explicit',
      state: explicit(ALICE.id),
      row: ALICE_ROW,
      expected: true,
    },
    {
      mode: 'explicit',
      state: explicit(ALICE.id),
      row: BOB_ROW,
      expected: false,
    },
    {
      mode: 'select-all',
      state: allBut(BOB.id),
      row: ALICE_ROW,
      expected: true,
    },
    {
      mode: 'select-all',
      state: allBut(BOB.id),
      row: BOB_ROW,
      expected: false,
    },
    { mode: 'select-all', state: allBut(), row: LOCKED_ROW, expected: false },
  ])(
    'should return $expected from isRowSelected for $row.id in $mode mode',
    ({ state, row, expected }) => {
      // Given
      const handlers = renderHandlers(state);

      // When
      const result = handlers.isRowSelected(row);

      // Then
      expect(result).toBe(expected);
    }
  );

  it.each([
    {
      description: 'adds an unselected row in explicit mode',
      initial: explicit(ALICE.id),
      row: BOB_ROW,
      expected: explicit(ALICE.id, BOB.id),
    },
    {
      description: 'removes a selected row in explicit mode',
      initial: explicit(ALICE.id),
      row: ALICE_ROW,
      expected: explicit(),
    },
    {
      description: 'excludes a row in select-all mode',
      initial: allBut(),
      row: BOB_ROW,
      expected: allBut(BOB.id),
    },
    {
      description: 'brings an excluded row back in select-all mode',
      initial: allBut(BOB.id),
      row: BOB_ROW,
      expected: allBut(),
    },
    {
      description: 'ignores a row that cannot be selected',
      initial: explicit(),
      row: LOCKED_ROW,
      expected: explicit(),
    },
  ])(
    'should update the state when toggleRow $description',
    ({ initial, row, expected }) => {
      // Given
      const { result } = renderSelection(initial);

      // When
      act(() => result.current.handlers.toggleRow(row));

      // Then
      expect(result.current.state).toEqual(expected);
    }
  );

  it.each([
    {
      mode: 'explicit',
      state: explicit(ALICE.id),
      totalCount: undefined,
      expected: 1,
    },
    {
      mode: 'select-all',
      state: allBut(BOB.id),
      totalCount: undefined,
      expected: 1,
    },
    {
      mode: 'select-all',
      state: allBut(BOB.id),
      totalCount: TOTAL_COUNT,
      expected: TOTAL_COUNT - 1,
    },
  ])(
    'should count $expected in $mode mode when the total count is $totalCount',
    ({ state, totalCount, expected }) => {
      // Given
      const handlers = renderHandlers(state);

      // When
      const result = handlers.getSelectionCount(TABLE, totalCount);

      // Then
      expect(result).toBe(expected);
    }
  );

  it.each([
    {
      description: 'nothing is selected',
      state: explicit(),
      table: TABLE,
      all: false,
      some: false,
    },
    {
      description: 'one row is selected',
      state: explicit(ALICE.id),
      table: TABLE,
      all: false,
      some: true,
    },
    {
      description: 'every row is picked',
      state: explicit(ALICE.id, BOB.id),
      table: TABLE,
      all: true,
      some: false,
    },
    {
      description: 'every row is selected',
      state: allBut(),
      table: TABLE,
      all: true,
      some: false,
    },
    {
      description: 'one row is excluded',
      state: allBut(BOB.id),
      table: TABLE,
      all: false,
      some: true,
    },
    {
      description: 'no row can be selected in select-all mode',
      state: allBut(),
      table: LOCKED_TABLE,
      all: false,
      some: false,
    },
    {
      description: 'no row can be selected in explicit mode',
      state: explicit(ALICE.id),
      table: LOCKED_TABLE,
      all: false,
      some: false,
    },
  ])(
    'should report all $all and some $some when $description',
    ({ state, table, all, some }) => {
      // Given
      const handlers = renderHandlers(state);

      // When
      const result = {
        all: handlers.isAllSelected(table),
        some: handlers.isSomeSelected(table),
      };

      // Then
      expect(result).toEqual({ all, some });
    }
  );

  it.each([
    {
      description: 'switch to select-all mode and drop the picked ids',
      initial: explicit(ALICE.id),
      expected: allBut(),
    },
    {
      description: 'switch select-all mode off and drop the excluded ids',
      initial: allBut(BOB.id),
      expected: emptySelection(),
    },
  ])(
    'should $description when toggleSelectAll is called',
    ({ initial, expected }) => {
      // Given
      const { result } = renderSelection(initial);

      // When
      act(() => result.current.handlers.toggleSelectAll());

      // Then
      expect(result.current.state).toEqual(expected);
    }
  );

  it('should reset the selection when cleared', () => {
    // Given
    const { result } = renderSelection(allBut(BOB.id));

    // When
    act(() => result.current.handlers.clearSelection());

    // Then
    expect(result.current.state).toEqual(emptySelection());
  });
});
