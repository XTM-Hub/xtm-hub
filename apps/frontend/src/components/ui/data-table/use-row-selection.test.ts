import type { Row, Table } from '@tanstack/react-table';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useRowSelection, type SelectionState } from './use-row-selection';

interface Person {
  id: string;
  name: string;
  email: string;
}

const ALICE: Person = {
  id: 'alice',
  name: 'Alice',
  email: 'alice@filigran.io',
};
const BOB: Person = { id: 'bob', name: 'Bob', email: 'bob@filigran.io' };

const emptySelection = (): SelectionState => ({
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
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
