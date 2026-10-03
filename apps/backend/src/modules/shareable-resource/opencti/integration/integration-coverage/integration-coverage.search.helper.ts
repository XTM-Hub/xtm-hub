import z from 'zod';
import {
  IntegrationCoverageSearchInput,
  IntegrationType,
} from '../../../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../../../utils/error/error.code';
import { IntegrationCoverageHelper } from './integration-coverage.helper';
import {
  COVERAGE_FAMILIES,
  COVERAGE_MAX_VALUE_LENGTH,
  COVERAGE_MAX_VALUES,
  COVERAGE_SEARCH_DEFAULT_FIRST,
  COVERAGE_SEARCH_MAX_FIRST,
  COVERAGE_SEARCH_MAX_TERM_LENGTH,
  CoverageFamily,
  DECLARED_COVERAGE_WEIGHT,
  GLOBAL_REGION_VALUES,
  INFERRED_COVERAGE_WEIGHT,
  IntegrationCoverage,
  StoredIntegrationCoverage,
} from './integration-coverage.model';

export type CoverageSearchRequest = IntegrationCoverage & {
  integrationTypes: IntegrationType[];
  searchTerm: string | undefined;
  first: number;
};

export type CoverageMatchScore = {
  score: number;
  matched_object_types: string[];
  matched_sectors: string[];
  matched_regions: string[];
};

export type RankedCoverageMatch = {
  id: string;
  slug: string;
  name: string;
  score: number;
  download_number: number;
};

const SearchValuesSchema = z
  .array(z.string().trim().min(1).max(COVERAGE_MAX_VALUE_LENGTH))
  .max(COVERAGE_MAX_VALUES)
  .nullish();

const CoverageSearchInputSchema = z.object({
  objectTypes: SearchValuesSchema,
  sectors: SearchValuesSchema,
  regions: SearchValuesSchema,
  integrationTypes: z
    .array(z.nativeEnum(IntegrationType))
    .max(COVERAGE_MAX_VALUES)
    .nullish(),
  searchTerm: z.string().trim().max(COVERAGE_SEARCH_MAX_TERM_LENGTH).nullish(),
  first: z.number().int().nullish(),
});

const SCORE_PRECISION = 10_000;

const toKey = (value: string): string => value.toLowerCase();

const coversRequestedValue = (
  family: CoverageFamily,
  coveredKeys: Set<string>,
  requested: string
): boolean => {
  if (coveredKeys.has(toKey(requested))) {
    return true;
  }
  return (
    family === 'regions' &&
    GLOBAL_REGION_VALUES.some((globalValue) => coveredKeys.has(globalValue))
  );
};

export const IntegrationCoverageSearchHelper = {
  clampFirst: (first: number | null | undefined): number =>
    Math.min(
      Math.max(first ?? COVERAGE_SEARCH_DEFAULT_FIRST, 1),
      COVERAGE_SEARCH_MAX_FIRST
    ),

  /** Validates the bounds, then canonicalizes and deduplicates the requested values. */
  normalizeSearchInput: (
    input: IntegrationCoverageSearchInput
  ): CoverageSearchRequest => {
    const parsed = CoverageSearchInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(BadRequestErrorCode.InvalidCoverageSearchInput);
    }
    const { objectTypes, sectors, regions, integrationTypes, searchTerm } =
      parsed.data;
    return {
      object_types: IntegrationCoverageHelper.normalizeValues(
        'object_types',
        objectTypes
      ),
      sectors: IntegrationCoverageHelper.normalizeValues('sectors', sectors),
      regions: IntegrationCoverageHelper.normalizeValues('regions', regions),
      integrationTypes: [...new Set(integrationTypes ?? [])],
      searchTerm: searchTerm || undefined,
      first: IntegrationCoverageSearchHelper.clampFirst(parsed.data.first),
    };
  },

  hasRequestedFacets: (request: IntegrationCoverage): boolean =>
    IntegrationCoverageHelper.hasValues(request),

  /** Lowercase values a stored region list must contain to match the request. */
  buildRegionMatchKeys: (regions: readonly string[]): string[] => [
    ...new Set([...regions.map(toKey), ...GLOBAL_REGION_VALUES]),
  ],

  /**
   * Average, over the requested families, of matched / requested values,
   * weighted by the confidence in the coverage (declared or inferred).
   */
  scoreCoverage: (
    request: IntegrationCoverage,
    coverage: StoredIntegrationCoverage
  ): CoverageMatchScore => {
    const matched: IntegrationCoverage =
      IntegrationCoverageHelper.emptyCoverage();
    const ratios: number[] = [];

    for (const family of COVERAGE_FAMILIES) {
      const requested = request[family];
      if (requested.length === 0) {
        continue;
      }
      const coveredKeys = new Set(
        IntegrationCoverageHelper.normalizeValues(family, coverage[family]).map(
          toKey
        )
      );
      matched[family] = requested.filter((value) =>
        coversRequestedValue(family, coveredKeys, value)
      );
      ratios.push(matched[family].length / requested.length);
    }

    const weight = coverage.inferred
      ? INFERRED_COVERAGE_WEIGHT
      : DECLARED_COVERAGE_WEIGHT;
    const average =
      ratios.length === 0
        ? 0
        : ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;

    return {
      score: Math.round(weight * average * SCORE_PRECISION) / SCORE_PRECISION,
      matched_object_types: matched.object_types,
      matched_sectors: matched.sectors,
      matched_regions: matched.regions,
    };
  },

  /** Score desc, then download count desc, then name, slug and id for a total order. */
  compareRankedMatches: (
    left: RankedCoverageMatch,
    right: RankedCoverageMatch
  ): number =>
    right.score - left.score ||
    right.download_number - left.download_number ||
    left.name.localeCompare(right.name, 'en') ||
    left.slug.localeCompare(right.slug, 'en') ||
    left.id.localeCompare(right.id, 'en'),
};
