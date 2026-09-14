import {
  Filter,
  FilterKey,
  LogicalFilterInput,
  LogicalOperator,
} from '../../../../__generated__/resolvers-types';

// Column keys selectable in the "Generate a CSV export" dialog; "name" is always exported and not listed here.
export enum IntegrationCsvColumnKey {
  IntegrationType = 'integration_type',
  UseCase = 'use_case',
  DeploymentType = 'deployment_type',
  VerificationStatus = 'verification_status',
  SolutionCategory = 'solution_category',
  LicenseType = 'license_type',
}

// Maps export query params to FilterKey; `use_case` maps to `Label`, the FilterKey used internally for the Object_UseCase join.
export const EXPORT_FILTER_PARAMS: Array<{
  queryParam: string;
  key: FilterKey;
}> = [
  { queryParam: 'integration_type', key: FilterKey.IntegrationType },
  { queryParam: 'license_type', key: FilterKey.LicenseType },
  { queryParam: 'manager_supported', key: FilterKey.ManagerSupported },
  { queryParam: 'solution_category', key: FilterKey.SolutionCategory },
  { queryParam: 'verified', key: FilterKey.Verified },
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

type CellValueExtractor = (row: IntegrationCsvExportRow) => string;

const extractIntegrationType: CellValueExtractor = (row) =>
  row.integration_type ?? '';

const extractUseCase: CellValueExtractor = (row) =>
  (row.use_cases ?? [])
    .map((useCase) => useCase.name)
    .join(MULTI_VALUE_SEPARATOR);

const extractDeploymentType: CellValueExtractor = (row) => {
  if (row.manager_supported === null || row.manager_supported === undefined) {
    return '';
  }
  return row.manager_supported ? 'Automatic deploy' : 'Manual deploy';
};

const extractVerificationStatus: CellValueExtractor = (row) => {
  if (row.verified === null || row.verified === undefined) {
    return '';
  }
  return row.verified ? 'Verified' : 'Unverified';
};

const extractSolutionCategory: CellValueExtractor = (row) =>
  (row.solution_categories ?? [])
    .map((category) => category.name)
    .join(MULTI_VALUE_SEPARATOR);

const extractLicenseType: CellValueExtractor = (row) => row.license_type ?? '';

// One extractor per column key; keeps cellValueForColumn a plain lookup instead of a switch.
const CELL_VALUE_EXTRACTORS: Record<
  IntegrationCsvColumnKey,
  CellValueExtractor
> = {
  [IntegrationCsvColumnKey.IntegrationType]: extractIntegrationType,
  [IntegrationCsvColumnKey.UseCase]: extractUseCase,
  [IntegrationCsvColumnKey.DeploymentType]: extractDeploymentType,
  [IntegrationCsvColumnKey.VerificationStatus]: extractVerificationStatus,
  [IntegrationCsvColumnKey.SolutionCategory]: extractSolutionCategory,
  [IntegrationCsvColumnKey.LicenseType]: extractLicenseType,
};

const cellValueForColumn = (
  row: IntegrationCsvExportRow,
  key: IntegrationCsvColumnKey
): string => CELL_VALUE_EXTRACTORS[key]?.(row) ?? '';

// Excel/Sheets treat a cell starting with any of these as a formula to evaluate.
const FORMULA_TRIGGER_CHARS = /^[=+\-@\t\r]/;

// Prevents CSV formula injection (CWE-1236) by prefixing formula-like cells with an apostrophe.
export const neutralizeFormulaCell = (value: string): string =>
  FORMULA_TRIGGER_CHARS.test(value) ? `'${value}` : value;

// RFC 4180 escaping: wraps in quotes when it contains a comma, quote or line break, doubling internal quotes.
export const escapeCsvCell = (value: string): string => {
  const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
};

// Falls back to all default columns when the param is missing, empty, or has no recognized keys.
export const parseRequestedColumns = (
  raw?: string | string[]
): IntegrationCsvColumnKey[] => {
  if (!raw) {
    return DEFAULT_INTEGRATION_CSV_COLUMNS;
  }
  // Express gives an array on repeated params (columns=a&columns=b); split each element too, so columns=a,b&columns=c isn't dropped.
  const values = (Array.isArray(raw) ? raw : [raw]).flatMap((value) =>
    value.split(',')
  );
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

// Builds the LogicalFilterInput tree consumed by DocumentApp.loadDocuments; undefined when no filter param is present.
export const parseRequestedFilters = (
  query: Record<string, unknown>
): LogicalFilterInput | undefined => {
  const children: Array<{ leaf: Filter }> = EXPORT_FILTER_PARAMS.flatMap(
    ({ queryParam, key }) => {
      const raw = query[queryParam] as string | string[] | undefined;
      if (!raw) {
        return [];
      }
      // Express gives an array on repeated params; split each element too, so a,b&c isn't dropped.
      const values = (Array.isArray(raw) ? raw : [raw])
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      return values.length > 0 ? [{ leaf: { key, value: values } }] : [];
    }
  );

  return children.length > 0
    ? { operator: LogicalOperator.And, children }
    : undefined;
};

// UTF-8 BOM + CRLF for Excel/Sheets compatibility; "Name" column is always first, followed by the requested columns.
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
    return cells.map(neutralizeFormulaCell).map(escapeCsvCell).join(',');
  });

  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}\r\n`;
};

// e.g. "integrations-library-export-2026-09-10.csv".
export const buildIntegrationsExportFilename = (
  date: Date = new Date()
): string => {
  const isoDate = date.toISOString().slice(0, 10);
  return `integrations-library-export-${isoDate}.csv`;
};
