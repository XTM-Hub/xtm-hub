import { UseTranslationsProps } from '@/i18n/config';
import { DatatableI18nKey } from '@filigran/ui';

export const i18nKey = (
  t: UseTranslationsProps
): Partial<DatatableI18nKey> => ({
  'Rows per page': t('Datatable.RowsPerPage'),
  'Manage columns visibility': t('Datatable.ManageColumnsVisibility'),
  'Column options': t('Datatable.ColumnOptions'),
  'Clear selection': t('Datatable.ClearSelection'),
  Asc: t('Datatable.Asc'),
  Desc: t('Datatable.Desc'),
  Hide: t('Datatable.Hide'),
  'Go to first page': t('Datatable.GoFirstPage'),
  'Go to previous page': t('Datatable.GoPreviousPage'),
  'Go to next page': t('Datatable.GoNextPage'),
  'Go to last page': t('Datatable.GoLastPage'),
  Columns: t('Datatable.Columns'),
  'Reset table': t('Datatable.ResetTable'),
});
