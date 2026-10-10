import type { useTranslate } from '@/hooks/use-translate';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { describe, expect, it } from 'vitest';

const SELECTED_COUNT = 3;

describe('getDataTableLabels', () => {
  const t = ((key: string, values?: { count?: number }) =>
    values?.count === undefined
      ? key
      : `${key}:${values.count}`) as unknown as ReturnType<typeof useTranslate>;

  it('should name every control of the table with its translation', () => {
    // Given / When
    const labels = getDataTableLabels(t);

    // Then
    expect(labels).toEqual({
      previousPageLabel: 'DesignSystem.DataTable.PreviousPage',
      nextPageLabel: 'DesignSystem.DataTable.NextPage',
      manageColumnsLabel: 'DesignSystem.DataTable.ManageColumns',
      resetTableLabel: 'DesignSystem.DataTable.ResetTable',
      columnsLabel: 'DesignSystem.DataTable.Columns',
      rowsPerPageLabel: 'DesignSystem.DataTable.RowsPerPage',
      columnOptionsLabel: 'DesignSystem.DataTable.ColumnOptions',
      sortAscendingLabel: 'DesignSystem.DataTable.SortAscending',
      sortDescendingLabel: 'DesignSystem.DataTable.SortDescending',
      hideColumnLabel: 'DesignSystem.DataTable.HideColumn',
      clearSelectionLabel: 'DesignSystem.DataTable.ClearSelection',
      selectAllLabel: 'DesignSystem.DataTable.SelectAll',
      selectRowLabel: 'DesignSystem.DataTable.SelectRow',
      selectedCountLabel: expect.any(Function),
    });
  });

  it('should translate the selected count with the count when called', () => {
    // Given
    const { selectedCountLabel } = getDataTableLabels(t);

    // When
    const result = selectedCountLabel(SELECTED_COUNT);

    // Then
    expect(result).toBe(
      `DesignSystem.DataTable.SelectedCount:${SELECTED_COUNT}`
    );
  });
});
