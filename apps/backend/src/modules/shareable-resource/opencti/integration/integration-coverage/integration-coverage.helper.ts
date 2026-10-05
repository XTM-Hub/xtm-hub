import z from 'zod';
import { DocumentMetadataKeyCode } from '../../../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../../../utils/error/error.code';
import {
  COVERAGE_KEYWORD_RULES,
  inferIntegrationCoverage,
  KNOWN_OBJECT_TYPES,
  OBJECT_TYPE_ALIASES,
} from './integration-coverage.inference';
import {
  COVERAGE_FAMILIES,
  COVERAGE_MAX_VALUE_LENGTH,
  COVERAGE_MAX_VALUES,
  COVERAGE_METADATA_KEY_BY_FAMILY,
  COVERAGE_METADATA_KEYS,
  CoverageFamily,
  CoverageInferenceSource,
  IntegrationCoverage,
  IntegrationCoverageDeclaration,
  StoredIntegrationCoverage,
} from './integration-coverage.model';

export type IntegrationCoverageDocumentFields = {
  covered_object_types: string;
  covered_sectors: string;
  covered_regions: string;
  coverage_inferred: string;
};

const CoverageValuesSchema = z
  .array(z.string().trim().min(1).max(COVERAGE_MAX_VALUE_LENGTH))
  .max(COVERAGE_MAX_VALUES)
  .nullish();

/**
 * Validation rules shared by the manifest, the manifest fragments and the admin form. Strict: a misspelled family
 * (`objectTypes`) makes the declaration invalid instead of being silently dropped.
 */
export const IntegrationCoverageDeclarationSchema = z
  .object({
    object_types: CoverageValuesSchema,
    sectors: CoverageValuesSchema,
    regions: CoverageValuesSchema,
  })
  .strict();

const CANONICAL_OBJECT_TYPES = new Map<string, string>([
  ...KNOWN_OBJECT_TYPES.map((type) => [type.toLowerCase(), type] as const),
  ...Object.entries(OBJECT_TYPE_ALIASES),
]);

const buildVocabulary = (family: CoverageFamily, extra: string[] = []) =>
  new Map<string, string>(
    [
      ...COVERAGE_KEYWORD_RULES[family].flatMap((rule) => rule.values),
      ...extra,
    ].map((value) => [value.toLowerCase(), value] as const)
  );

const CANONICAL_VOCABULARY: Record<
  Exclude<CoverageFamily, 'object_types'>,
  Map<string, string>
> = {
  sectors: buildVocabulary('sectors'),
  regions: buildVocabulary('regions', ['Worldwide']),
};

const collapseSpaces = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const objectTypeKey = (value: string): string =>
  collapseSpaces(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

/** An OpenCTI entity or observable type, in any case or spelled with an accepted alias. */
const isKnownObjectType = (value: string): boolean =>
  CANONICAL_OBJECT_TYPES.has(objectTypeKey(value));

/**
 * The complete validation of a declaration: the shared rules plus the object types, a closed OpenCTI vocabulary
 * (served by integrationCoverageObjectTypes). Every path that accepts a declaration uses it.
 */
export const ValidIntegrationCoverageDeclarationSchema =
  IntegrationCoverageDeclarationSchema.refine((declaration) =>
    (declaration.object_types ?? []).every(isKnownObjectType)
  );

const canonicalizeValue = (family: CoverageFamily, value: string): string => {
  const collapsed = collapseSpaces(value);
  if (family === 'object_types') {
    return CANONICAL_OBJECT_TYPES.get(objectTypeKey(value)) ?? collapsed;
  }
  return CANONICAL_VOCABULARY[family].get(collapsed.toLowerCase()) ?? collapsed;
};

const toComparableKey = (value: string): string => value.toLowerCase();

const COVERAGE_METADATA_KEY_SET: ReadonlySet<string> = new Set(
  COVERAGE_METADATA_KEYS
);

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export const IntegrationCoverageHelper = {
  emptyCoverage: (): IntegrationCoverage => ({
    object_types: [],
    sectors: [],
    regions: [],
  }),

  /** Trims, canonicalizes and deduplicates (case-insensitively, first spelling wins) a list. */
  normalizeValues: (
    family: CoverageFamily,
    values: readonly string[] | null | undefined
  ): string[] => {
    const normalized = new Map<string, string>();
    for (const value of values ?? []) {
      const canonical = canonicalizeValue(family, value);
      const key = toComparableKey(canonical);
      if (canonical !== '' && !normalized.has(key)) {
        normalized.set(key, canonical);
      }
    }
    return [...normalized.values()];
  },

  normalizeDeclaration: (
    declaration: IntegrationCoverageDeclaration | null | undefined
  ): IntegrationCoverage => ({
    object_types: IntegrationCoverageHelper.normalizeValues(
      'object_types',
      declaration?.object_types
    ),
    sectors: IntegrationCoverageHelper.normalizeValues(
      'sectors',
      declaration?.sectors
    ),
    regions: IntegrationCoverageHelper.normalizeValues(
      'regions',
      declaration?.regions
    ),
  }),

  hasValues: (coverage: IntegrationCoverage): boolean =>
    COVERAGE_FAMILIES.some((family) => coverage[family].length > 0),

  isSameCoverage: (
    left: IntegrationCoverage,
    right: IntegrationCoverage
  ): boolean =>
    COVERAGE_FAMILIES.every((family) => {
      const leftKeys = new Set(left[family].map(toComparableKey));
      const rightKeys = new Set(right[family].map(toComparableKey));
      return (
        leftKeys.size === rightKeys.size &&
        [...leftKeys].every((key) => rightKeys.has(key))
      );
    }),

  assertValidDeclaration: (
    declaration: IntegrationCoverageDeclaration | null | undefined
  ): void => {
    if (declaration == null) {
      return;
    }
    if (
      !ValidIntegrationCoverageDeclarationSchema.safeParse(declaration).success
    ) {
      throw new Error(BadRequestErrorCode.InvalidIntegrationCoverage);
    }
  },

  /** Reads a stored list: a JSON array string from the metadata table, or an already parsed array. */
  parseStoredList: (value: unknown): string[] => {
    const parsed = typeof value === 'string' ? parseJson(value) : value;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is string => typeof item === 'string' && item !== ''
    );
  },

  /** Missing means nothing was declared, hence the coverage is (or will be) inferred. */
  parseCoverageInferred: (value: unknown): boolean =>
    value !== false && value !== 'false',

  parseStoredCoverage: (
    record: Partial<Record<DocumentMetadataKeyCode, unknown>>
  ): StoredIntegrationCoverage | null => {
    const hasStoredCoverage = [
      ...COVERAGE_FAMILIES.map(
        (family) => COVERAGE_METADATA_KEY_BY_FAMILY[family]
      ),
      DocumentMetadataKeyCode.CoverageInferred,
    ].some((key) => record[key] != null);
    if (!hasStoredCoverage) {
      return null;
    }
    return {
      object_types: IntegrationCoverageHelper.parseStoredList(
        record[DocumentMetadataKeyCode.CoveredObjectTypes]
      ),
      sectors: IntegrationCoverageHelper.parseStoredList(
        record[DocumentMetadataKeyCode.CoveredSectors]
      ),
      regions: IntegrationCoverageHelper.parseStoredList(
        record[DocumentMetadataKeyCode.CoveredRegions]
      ),
      inferred: IntegrationCoverageHelper.parseCoverageInferred(
        record[DocumentMetadataKeyCode.CoverageInferred]
      ),
    };
  },

  inferCoverage: (
    inferenceSource: CoverageInferenceSource
  ): StoredIntegrationCoverage => ({
    ...inferIntegrationCoverage(inferenceSource),
    inferred: true,
  }),

  /**
   * Priority: a non-empty declaration (manifest or fragment), then the declared
   * coverage already stored (manifest or admin), then inference. Inferred values
   * never replace a declared coverage.
   */
  resolveCoverage: ({
    declared,
    existing,
    inferenceSource,
  }: {
    declared?: IntegrationCoverageDeclaration | null;
    existing?: StoredIntegrationCoverage | null;
    inferenceSource: CoverageInferenceSource;
  }): StoredIntegrationCoverage => {
    const declaredCoverage =
      IntegrationCoverageHelper.normalizeDeclaration(declared);
    if (IntegrationCoverageHelper.hasValues(declaredCoverage)) {
      return { ...declaredCoverage, inferred: false };
    }
    if (
      existing &&
      !existing.inferred &&
      IntegrationCoverageHelper.hasValues(existing)
    ) {
      return existing;
    }
    return IntegrationCoverageHelper.inferCoverage(inferenceSource);
  },

  /**
   * Admin form semantics: an omitted list keeps its stored value, declared or
   * inferred, clearing every list returns to inference, and submitting the
   * inferred values unchanged keeps the coverage inferred unless `confirmed`
   * declares it. An empty coverage is never declared, confirmed or not: a
   * declaration without values would be replaced by inference on the next update.
   */
  resolveAdminCoverage: ({
    input,
    existing,
    inferenceSource,
    confirmed = false,
  }: {
    input: IntegrationCoverageDeclaration;
    existing?: StoredIntegrationCoverage | null;
    inferenceSource: CoverageInferenceSource;
    confirmed?: boolean;
  }): StoredIntegrationCoverage => {
    const providedFamilies = COVERAGE_FAMILIES.filter(
      (family) => input[family] != null
    );
    if (providedFamilies.length === 0) {
      return IntegrationCoverageHelper.resolveCoverage({
        existing,
        inferenceSource,
      });
    }

    const base = existing ?? IntegrationCoverageHelper.emptyCoverage();
    const submitted: IntegrationCoverage = {
      object_types: base.object_types,
      sectors: base.sectors,
      regions: base.regions,
    };
    for (const family of providedFamilies) {
      submitted[family] = IntegrationCoverageHelper.normalizeValues(
        family,
        input[family]
      );
    }

    if (!IntegrationCoverageHelper.hasValues(submitted)) {
      return IntegrationCoverageHelper.inferCoverage(inferenceSource);
    }
    if (
      !confirmed &&
      existing?.inferred &&
      IntegrationCoverageHelper.isSameCoverage(submitted, existing)
    ) {
      return IntegrationCoverageHelper.inferCoverage(inferenceSource);
    }
    return { ...submitted, inferred: false };
  },

  /** Coverage metadata is resolved server-side; entries sent by a client are dropped. */
  withoutCoverageMetadata: <T extends { key: string }>(metadata: T[]): T[] =>
    metadata.filter(({ key }) => !COVERAGE_METADATA_KEY_SET.has(key)),

  toDocumentFields: (
    coverage: StoredIntegrationCoverage
  ): IntegrationCoverageDocumentFields => ({
    covered_object_types: JSON.stringify(coverage.object_types),
    covered_sectors: JSON.stringify(coverage.sectors),
    covered_regions: JSON.stringify(coverage.regions),
    coverage_inferred: String(coverage.inferred),
  }),

  toMetadataEntries: (
    coverage: StoredIntegrationCoverage
  ): { key: DocumentMetadataKeyCode; value: string }[] => {
    const fields = IntegrationCoverageHelper.toDocumentFields(coverage);
    return [
      {
        key: DocumentMetadataKeyCode.CoveredObjectTypes,
        value: fields.covered_object_types,
      },
      {
        key: DocumentMetadataKeyCode.CoveredSectors,
        value: fields.covered_sectors,
      },
      {
        key: DocumentMetadataKeyCode.CoveredRegions,
        value: fields.covered_regions,
      },
      {
        key: DocumentMetadataKeyCode.CoverageInferred,
        value: fields.coverage_inferred,
      },
    ];
  },
};
