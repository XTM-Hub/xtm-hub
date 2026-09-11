import {
  Filter,
  FilterKey,
  LogicalFilterInput,
  LogicalOperator,
} from '../../../../__generated__/resolvers-types';

// Column keys the user can pick in the "Generate a CSV export" dialog.
// "name" is always exported and is not part of this selectable list.
export enum IntegrationCsvColumnKey {
  IntegrationType = 'integration_type',
  UseCase = 'use_case',
  DeploymentType = 'deployment_type',
  VerificationStatus = 'verification_status',
  SolutionCategory = 'solution_category',
  LicenseType = 'license_type',
}

// Filter params the user can narrow the export down to. `queryParam` is the
// URL query string key; `key` is the corresponding FilterKey passed to
// DocumentDomain.loadDocuments. Most map 1:1 onto the FilterKey enum value,
// except `use_case`, which (confusingly) maps to the `label` FilterKey used
// internally for the Object_UseCase join. `solution_category` and
// `use_case` values are Relay global IDs (see ListSolutionCategories and
// useCases); the others are raw metadata/document values (e.g.
// `connector`, `true`/`false`, `Free`/`Commercial`).
export const EXPORT_FILTER_PARAMS: Array<{
  queryParam: string;
  key: FilterKey;
}> = [
  { queryParam: 'integration_type', key: FilterKey.IntegrationType },
  { queryParam: 'license_type', key: FilterKey.LicenseType },
  { queryParam: 'manager_supported', key: FilterKey.ManagerSupported },
  { queryParam: 'verified', key: FilterKey.Verified },
  { queryParam: 'solution_category', key: FilterKey.SolutionCategory },
  { queryParam: 'use_case', key: FilterKey.Label },
];

export const INTEGRATION_CSV_EXPORT_COLUMNS: Array<{
  key: IntegrationCsvColumnKey;
  header: string;
}> = [
  { key: IntegrationCsvColumnKey.IntegrationType, header: 'Integration type' },
  { key: IntegrationCsvColumnKey.UseCase, header: 'Use case' },
  { key: IntegrationCsvColumnKey.DeploymentType, header: 'Deployment type' },
  {
    key: IntegrationCsvColumnKey.VerificationStatus,
    header: 'Verification status',
  },
  {
    key: IntegrationCsvColumnKey.SolutionCategory,
    header: 'Solution category',
  },
  { key: IntegrationCsvColumnKey.LicenseType, header: 'License type' },
];

export const DEFAULT_INTEGRATION_CSV_COLUMNS: IntegrationCsvColumnKey[] =
  INTEGRATION_CSV_EXPORT_COLUMNS.map(({ key }) => key);

export interface IntegrationCsvExportRow {
  id: string;
  name: string | null;
  integration_type?: string | null;
  manager_supported?: boolean | null;
  verified?: boolean | null;
  license_type?: string | null;
  use_cases?: Array<{ name: string }>;
  solution_categories?: Array<{ name: string }>;
}

const MULTI_VALUE_SEPARATOR = ';';

const columnHeader = (key: IntegrationCsvColumnKey): string =>
  INTEGRATION_CSV_EXPORT_COLUMNS.find((column) => column.key === key)?.header ??
  key;

const cellValueForColumn = (
  row: IntegrationCsvExportRow,
  key: IntegrationCsvColumnKey
): string => {
  switch (key) {
    case IntegrationCsvColumnKey.IntegrationType:
      return row.integration_type ?? '';
    case IntegrationCsvColumnKey.UseCase:
      return (row.use_cases ?? [])
        .map((useCase) => useCase.name)
        .join(MULTI_VALUE_SEPARATOR);
    case IntegrationCsvColumnKey.DeploymentType:
      if (
        row.manager_supported === null ||
        row.manager_supported === undefined
      ) {
        return '';
      }
      return row.manager_supported ? 'Automatic deploy' : 'Manual deploy';
    case IntegrationCsvColumnKey.VerificationStatus:
      if (row.verified === null || row.verified === undefined) {
        return '';
      }
      return row.verified ? 'Verified' : 'Unverified';
    case IntegrationCsvColumnKey.SolutionCategory:
      return (row.solution_categories ?? [])
        .map((category) => category.name)
        .join(MULTI_VALUE_SEPARATOR);
    case IntegrationCsvColumnKey.LicenseType:
      return row.license_type ?? '';
    default:
      return '';
  }
};

/**
 * Escapes a single CSV cell per RFC 4180: values containing commas, quotes
 * or line breaks are wrapped in double quotes, with internal quotes doubled.
 */
export const escapeCsvCell = (value: string): string => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Parses the `columns` query param into a validated, de-duplicated list of
 * column keys. Falls back to all columns when the param is missing, empty,
 * or contains no recognized keys.
 */
export const parseRequestedColumns = (
  raw?: string | string[]
): IntegrationCsvColumnKey[] => {
  if (!raw) {
    return DEFAULT_INTEGRATION_CSV_COLUMNS;
  }
  const values = Array.isArray(raw) ? raw : raw.split(',');
  const validKeys = new Set<string>(DEFAULT_INTEGRATION_CSV_COLUMNS);
  const requested = Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => validKeys.has(value))
    )
  ) as IntegrationCsvColumnKey[];
  return requested.length > 0 ? requested : DEFAULT_INTEGRATION_CSV_COLUMNS;
};

/**
 * Parses the export's row-filtering query params (see EXPORT_FILTER_PARAMS)
 * into a LogicalFilterInput tree, the same shape consumed by
 * DocumentDomain.loadDocuments/paginate. Unknown query params and keys with
 * no value are ignored. Returns undefined when no recognized filter is
 * present, i.e. the export is not narrowed down.
 */
export const parseRequestedFilters = (
  query: Record<string, unknown>
): LogicalFilterInput | undefined => {
  const children: Array<{ leaf: Filter }> = EXPORT_FILTER_PARAMS.flatMap(
    ({ queryParam, key }) => {
      const raw = query[queryParam] as string | string[] | undefined;
      if (!raw) {
        return [];
      }
      const values = (Array.isArray(raw) ? raw : raw.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      return values.length > 0 ? [{ leaf: { key, value: values } }] : [];
    }
  );

  return children.length > 0
    ? { operator: LogicalOperator.And, children }
    : undefined;
};

/**
 * Builds a RFC 4180 compatible CSV document (UTF-8 BOM + CRLF line endings,
 * for Excel/Google Sheets compatibility) from integration rows. Always
 * includes a "Name" column first, then the requested selectable columns.
 * Returns a header-only CSV when `rows` is empty.
 */
export const buildIntegrationsCsv = (
  rows: IntegrationCsvExportRow[],
  columns: IntegrationCsvColumnKey[] = DEFAULT_INTEGRATION_CSV_COLUMNS
): string => {
  const headerRow = ['Name', ...columns.map(columnHeader)]
    .map(escapeCsvCell)
    .join(',');

  const dataRows = rows.map((row) => {
    const cells = [
      row.name ?? '',
      ...columns.map((key) => cellValueForColumn(row, key)),
    ];
    return cells.map(escapeCsvCell).join(',');
  });

  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}\r\n`;
};

/**
 * Builds the date-stamped download filename, e.g.
 * "integrations-library-export-2026-09-10.csv".
 */
export const buildIntegrationsExportFilename = (
  date: Date = new Date()
): string => {
  const isoDate = date.toISOString().slice(0, 10);
  return `integrations-library-export-${isoDate}.csv`;
};
