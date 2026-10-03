import { DocumentMetadataKeyCode } from '../../../../../__generated__/resolvers-types';

export type CoverageFamily = 'object_types' | 'sectors' | 'regions';

export const COVERAGE_FAMILIES: readonly CoverageFamily[] = [
  'object_types',
  'sectors',
  'regions',
];

export type IntegrationCoverage = Record<CoverageFamily, string[]>;

export type StoredIntegrationCoverage = IntegrationCoverage & {
  inferred: boolean;
};

/** Optional per-family lists, as received from a manifest, a fragment or the admin form. */
export type IntegrationCoverageDeclaration = Partial<
  Record<CoverageFamily, readonly string[] | null | undefined>
>;

export type CoverageInferenceSource = {
  name?: string | null;
  short_description?: string | null;
  description?: string | null;
  use_cases?: readonly string[] | null;
  solution_categories?: readonly string[] | null;
};

export const COVERAGE_METADATA_KEY_BY_FAMILY: Record<
  CoverageFamily,
  DocumentMetadataKeyCode
> = {
  object_types: DocumentMetadataKeyCode.CoveredObjectTypes,
  sectors: DocumentMetadataKeyCode.CoveredSectors,
  regions: DocumentMetadataKeyCode.CoveredRegions,
};

export const COVERAGE_METADATA_KEYS: DocumentMetadataKeyCode[] = [
  DocumentMetadataKeyCode.CoveredObjectTypes,
  DocumentMetadataKeyCode.CoveredSectors,
  DocumentMetadataKeyCode.CoveredRegions,
  DocumentMetadataKeyCode.CoverageInferred,
];

export const COVERAGE_MAX_VALUES = 50;
export const COVERAGE_MAX_VALUE_LENGTH = 128;

export const COVERAGE_SEARCH_DEFAULT_FIRST = 20;
export const COVERAGE_SEARCH_MAX_FIRST = 100;
export const COVERAGE_SEARCH_MAX_TERM_LENGTH = 256;
// Bounds the rows scored in memory; the public catalog is far below it.
export const COVERAGE_SEARCH_MAX_CANDIDATES = 5000;

export const DECLARED_COVERAGE_WEIGHT = 1;
export const INFERRED_COVERAGE_WEIGHT = 0.6;

/** Lowercase region values that cover every requested region. */
export const GLOBAL_REGION_VALUES: readonly string[] = ['global', 'worldwide'];
