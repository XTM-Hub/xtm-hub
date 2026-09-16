import { FilterKey } from '@graphql/generated';

export interface IntegrationCsvExportColumn {
  key: string;
}

export const toIntegrationCsvColumnLabelKey = (key: string): string =>
  key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

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

export interface IntegrationCsvExportFilters {
  integrationTypes?: string[];
  useCases?: string[];
  licenseTypes?: string[];
  solutionCategories?: string[];
  verified?: string[];
  deployable?: string[];
}

const EXPORT_FILTER_QUERY_PARAMS: Array<{
  field: keyof IntegrationCsvExportFilters;
  queryParam: string;
}> = [
  { field: 'integrationTypes', queryParam: FilterKey.IntegrationType },
  { field: 'licenseTypes', queryParam: FilterKey.LicenseType },
  { field: 'deployable', queryParam: FilterKey.ManagerSupported },
  { field: 'solutionCategories', queryParam: FilterKey.SolutionCategory },
  { field: 'verified', queryParam: FilterKey.Verified },
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

export const extractFilenameFromContentDisposition = (
  header: string | null
): string | null => {
  if (!header) return null;
  const match = header.match(/filename="?([^"();]+)"?/i);
  return match?.[1] ?? null;
};

export const FALLBACK_CSV_EXPORT_FILENAME = 'integrations-library-export.csv';

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
