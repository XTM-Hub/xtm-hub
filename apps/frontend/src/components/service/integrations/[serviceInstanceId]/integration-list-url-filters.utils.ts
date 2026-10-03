import { LogicalMultiSelectSelection } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { IntegrationType } from '@graphql/generated';

export const INTEGRATION_TYPE_PARAM = 'integrationType';
export const LABEL_PARAM = 'label';
export const DEPLOYABLE_PARAM = 'deployable';
export const VERIFIED_PARAM = 'verified';
export const PRODUCT_VERSION_PARAM = 'productVersion';
export const LICENSE_TYPE_PARAM = 'licenseType';
export const SOLUTION_CATEGORY_PARAM = 'solutionCategory';
export const OBJECT_TYPE_PARAM = 'objectType';
export const SECTOR_PARAM = 'sector';
export const REGION_PARAM = 'region';

export const ALL_FILTER_PARAMS = [
  INTEGRATION_TYPE_PARAM,
  LABEL_PARAM,
  DEPLOYABLE_PARAM,
  VERIFIED_PARAM,
  PRODUCT_VERSION_PARAM,
  LICENSE_TYPE_PARAM,
  SOLUTION_CATEGORY_PARAM,
  OBJECT_TYPE_PARAM,
  SECTOR_PARAM,
  REGION_PARAM,
] as const;

export type FilterParamName = (typeof ALL_FILTER_PARAMS)[number];

const validIntegrationTypes = new Set(Object.values(IntegrationType));

// Coverage values are free text: a comma or a colon is part of the value
const FREE_TEXT_PARAMS: ReadonlySet<FilterParamName> = new Set([
  OBJECT_TYPE_PARAM,
  SECTOR_PARAM,
  REGION_PARAM,
]);

/**
 * Serializes a LogicalMultiSelectSelection to a compact string.
 * Entries are comma-separated, except for the free-text coverage params,
 * which are a JSON array of strings so that any value round-trips.
 *
 * Example: { connector: ['EXTERNAL_IMPORT', 'INTERNAL_ENRICHMENT'], csv_feed: [] }
 *   → 'connector,csv_feed'
 * Example (sector): { 'Retail, consumer goods': [] }
 *   → '["Retail, consumer goods"]'
 */
export const serializeSelection = (
  selection: LogicalMultiSelectSelection,
  paramName?: FilterParamName
): string => {
  const keys = Object.keys(selection).sort();
  if (paramName && FREE_TEXT_PARAMS.has(paramName)) {
    return keys.length > 0 ? JSON.stringify(keys) : '';
  }
  return keys.join(',');
};

const parseFreeTextValues = (raw: string): string[] | null => {
  if (!raw.startsWith('[')) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) &&
      parsed.every((value) => typeof value === 'string')
      ? parsed
      : null;
  } catch {
    return null;
  }
};

/**
 * Parses a compact param string into a LogicalMultiSelectSelection.
 * For integrationType, validates types against known enums.
 * For the free-text coverage params, reads the JSON array, and falls back to
 * the comma-separated format of earlier links.
 * For other params, accepts any non-empty key.
 *
 * Example: 'connector,csv_feed'
 *   → { connector: [], csv_feed: [] }
 */
export const parseSelection = (
  raw: string | null,
  paramName: FilterParamName
): LogicalMultiSelectSelection => {
  if (!raw) return {};
  const result: LogicalMultiSelectSelection = {};
  const freeTextValues = FREE_TEXT_PARAMS.has(paramName)
    ? parseFreeTextValues(raw)
    : null;
  if (freeTextValues) {
    for (const value of freeTextValues) {
      if (value.trim()) result[value] = [];
    }
    return result;
  }
  for (const entry of raw.split(',')) {
    const colonIndex = entry.indexOf(':');
    const key = colonIndex === -1 ? entry : entry.slice(0, colonIndex);

    if (paramName === INTEGRATION_TYPE_PARAM) {
      if (!validIntegrationTypes.has(key as IntegrationType)) continue;
      result[key] = [];
    } else {
      if (!key) continue;
      result[key] = [];
    }
  }
  return result;
};

export type AllFilters = Record<FilterParamName, LogicalMultiSelectSelection>;

export const emptyFilters = (): AllFilters =>
  Object.fromEntries(ALL_FILTER_PARAMS.map((p) => [p, {}])) as AllFilters;

export const parseAllFiltersFromWindowSearch = (): AllFilters => {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  return Object.fromEntries(
    ALL_FILTER_PARAMS.map((name) => [
      name,
      parseSelection(params.get(name), name),
    ])
  ) as AllFilters;
};

export const buildAllFiltersSearchParams = (filters: AllFilters): string => {
  const params = new URLSearchParams();
  for (const paramName of ALL_FILTER_PARAMS) {
    const serialized = serializeSelection(filters[paramName] ?? {}, paramName);
    if (serialized) params.set(paramName, serialized);
  }
  return params.toString();
};

export const allFiltersKey = (filters: AllFilters): string =>
  ALL_FILTER_PARAMS.map((name) =>
    serializeSelection(filters[name] ?? {}, name)
  ).join('||');
