import { FilterKey } from '@graphql/generated';

export interface IntegrationCsvExportColumn {
  key: string;
}

// Converts a snake_case backend column key (e.g. `integration_type`) into the
// PascalCase suffix used by the `Service.CsvExport.Columns.*` i18n keys
// (e.g. `IntegrationType`), avoiding a redundant hardcoded label-key mapping.
export const toIntegrationCsvColumnLabelKey = (key: string): string =>
  key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

// Mirrors IntegrationCsvColumnKey / INTEGRATION_CSV_EXPORT_COLUMNS in
// apps/backend/src/modules/shareable-resource/opencti/integration/integration.model.ts
// — keep both lists in sync when the backend adds or renames a column.
export const INTEGRATION_CSV_EXPORT_COLUMNS: IntegrationCsvExportColumn[] = [
  { key: 'integration_type' },
  { key: 'use_case' },
  { key: 'deployment_type' },
  { key: 'verification_status' },
  { key: 'solution_category' },
  { key: 'license_type' },
  { key: 'short_description' },
  { key: 'long_description' },
  { key: 'feed_url' },
  { key: 'opencti_documentation' },
  { key: 'vendor_url' },
  { key: 'demo_link' },
];

// Selected values (flat, no drill-down) for each of the export dialog's filters,
// independent from the Integrations Library list's own active filters.
export interface IntegrationCsvExportFilters {
  integrationTypes?: string[];
  useCases?: string[];
  licenseTypes?: string[];
  solutionCategories?: string[];
  verified?: string[];
  deployable?: string[];
}

// Maps each IntegrationCsvExportFilters field to the query param name expected by
// EXPORT_FILTER_PARAMS in apps/backend/.../integration-csv-export.util.ts — keep in sync.
// Reuses the generated FilterKey enum wherever the query param matches it verbatim, so a
// backend rename of a FilterKey value is caught here at build time instead of drifting silently.
const EXPORT_FILTER_QUERY_PARAMS: Array<{
  field: keyof IntegrationCsvExportFilters;
  queryParam: string;
}> = [
  { field: 'integrationTypes', queryParam: FilterKey.IntegrationType },
  { field: 'licenseTypes', queryParam: FilterKey.LicenseType },
  { field: 'deployable', queryParam: FilterKey.ManagerSupported },
  { field: 'solutionCategories', queryParam: FilterKey.SolutionCategory },
  { field: 'verified', queryParam: FilterKey.Verified },
  // `use_case` has no matching FilterKey: the backend maps it to FilterKey.Label internally
  // (the Object_UseCase join), so this REST-only param name can't be derived from the enum.
  { field: 'useCases', queryParam: 'use_case' },
];

export const buildIntegrationsCsvExportUrl = (
  serviceInstanceId: string,
  columns: string[],
  filters: IntegrationCsvExportFilters = {}
): string => {
  const params = new URLSearchParams();
  if (columns.length > 0) {
    params.set('columns', columns.join(','));
  }
  EXPORT_FILTER_QUERY_PARAMS.forEach(({ field, queryParam }) => {
    const values = filters[field];
    if (values && values.length > 0) {
      params.set(queryParam, values.join(','));
    }
  });
  const query = params.toString();
  return `/document/csv-export/${serviceInstanceId}${query ? `?${query}` : ''}`;
};

// Extracts the filename from a Content-Disposition header (e.g. `attachment; filename="foo.csv"`).
export const extractFilenameFromContentDisposition = (
  header: string | null
): string | null => {
  if (!header) return null;
  const match = header.match(/filename="?([^"();]+)"?/i);
  return match?.[1] ?? null;
};

export const FALLBACK_CSV_EXPORT_FILENAME = 'integrations-library-export.csv';

// Fetches the CSV export with the session cookie included, then triggers a browser
// download via a Blob URL. Throws when the response is not ok so callers can show an error toast.
export const downloadIntegrationsCsv = async (
  serviceInstanceId: string,
  columns: string[],
  filters: IntegrationCsvExportFilters = {}
): Promise<void> => {
  const url = buildIntegrationsCsvExportUrl(
    serviceInstanceId,
    columns,
    filters
  );
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`CSV export failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const filename =
    extractFilenameFromContentDisposition(
      response.headers.get('Content-Disposition')
    ) ?? FALLBACK_CSV_EXPORT_FILENAME;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};
