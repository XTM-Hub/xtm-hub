import type { DataTableLabels } from '@/components/ui/data-table';
import type { useTranslate } from '@/hooks/use-translate';

// The table names its own controls in English unless given these.
export const getDataTableLabels = (
  t: ReturnType<typeof useTranslate>
): Required<DataTableLabels> => ({
  previousPageLabel: t('DesignSystem.DataTable.PreviousPage'),
  nextPageLabel: t('DesignSystem.DataTable.NextPage'),
  manageColumnsLabel: t('DesignSystem.DataTable.ManageColumns'),
  resetTableLabel: t('DesignSystem.DataTable.ResetTable'),
  columnsLabel: t('DesignSystem.DataTable.Columns'),
  rowsPerPageLabel: t('DesignSystem.DataTable.RowsPerPage'),
  columnOptionsLabel: t('DesignSystem.DataTable.ColumnOptions'),
  sortAscendingLabel: t('DesignSystem.DataTable.SortAscending'),
  sortDescendingLabel: t('DesignSystem.DataTable.SortDescending'),
  hideColumnLabel: t('DesignSystem.DataTable.HideColumn'),
  clearSelectionLabel: t('DesignSystem.DataTable.ClearSelection'),
  selectAllLabel: t('DesignSystem.DataTable.SelectAll'),
  selectRowLabel: t('DesignSystem.DataTable.SelectRow'),
  selectedCountLabel: (count: number) =>
    t('DesignSystem.DataTable.SelectedCount', { count }),
});
