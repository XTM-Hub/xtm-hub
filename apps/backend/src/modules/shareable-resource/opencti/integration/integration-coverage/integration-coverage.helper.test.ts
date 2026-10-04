import { describe, expect, it } from 'vitest';
import { DocumentMetadataKeyCode } from '../../../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../../../utils/error/error.code';
import { IntegrationCoverageHelper } from './integration-coverage.helper';
import {
  COVERAGE_MAX_VALUE_LENGTH,
  COVERAGE_MAX_VALUES,
  CoverageInferenceSource,
  StoredIntegrationCoverage,
} from './integration-coverage.model';

const MALWARE = 'Malware';
const INDICATOR = 'Indicator';
const FINANCE = 'Finance';
const EUROPE = 'Europe';
const MALWARE_SOURCE: CoverageInferenceSource = { name: 'Malware tracker' };
const NEUTRAL_SOURCE: CoverageInferenceSource = { name: 'Acme connector' };

const makeCoverage = (
  overrides: Partial<StoredIntegrationCoverage> = {}
): StoredIntegrationCoverage => ({
  object_types: [],
  sectors: [],
  regions: [],
  inferred: false,
  ...overrides,
});

describe('integrationCoverageHelper', () => {
  describe('normalizeValues', () => {
    it.each([
      ['lowercase dashed', ['ipv4-addr'], ['IPv4-Addr']],
      ['spaces instead of dashes', ['attack pattern'], ['Attack-Pattern']],
      ['an alias', ['File'], ['StixFile']],
      ['a spaced platform type', ['security platform'], ['SecurityPlatform']],
      [
        'an uppercase observable type',
        ['imei', 'ssh key'],
        ['IMEI', 'SSH-Key'],
      ],
      ['an unknown type kept as is', ['  Custom-Type  '], ['Custom-Type']],
      ['case duplicates', ['Malware', 'malware', 'MALWARE'], ['Malware']],
      ['empty values', ['', '   '], []],
      ['null', null, []],
    ])(
      'should canonicalize object types given %s',
      (_description, values, expected) => {
        // Given / When
        const normalized = IntegrationCoverageHelper.normalizeValues(
          'object_types',
          values
        );

        // Then
        expect(normalized).toEqual(expected);
      }
    );

    it.each([
      ['a known sector', 'sectors' as const, ['finance'], [FINANCE]],
      [
        'an unknown sector',
        'sectors' as const,
        ['Space  Industry'],
        ['Space Industry'],
      ],
      ['a known region', 'regions' as const, ['EUROPE'], [EUROPE]],
      ['worldwide', 'regions' as const, ['worldwide'], ['Worldwide']],
    ])('should canonicalize %s', (_description, family, values, expected) => {
      // Given / When
      const normalized = IntegrationCoverageHelper.normalizeValues(
        family,
        values
      );

      // Then
      expect(normalized).toEqual(expected);
    });
  });

  describe('assertValidDeclaration', () => {
    it.each([
      ['undefined', undefined],
      ['empty lists', { object_types: [], sectors: [], regions: [] }],
      [
        'the maximum number of values',
        {
          sectors: Array.from(
            { length: COVERAGE_MAX_VALUES },
            (_, i) => `s${i}`
          ),
        },
      ],
      [
        'the maximum value length',
        { regions: ['r'.repeat(COVERAGE_MAX_VALUE_LENGTH)] },
      ],
      [
        'OpenCTI object types in any case or with an alias',
        { object_types: ['Indicator', 'ipv4 addr', 'threat_actor_group'] },
      ],
    ])('should accept %s', (_description, declaration) => {
      // Given / When
      const call = () =>
        IntegrationCoverageHelper.assertValidDeclaration(declaration);

      // Then
      expect(call).not.toThrow();
    });

    it.each([
      [
        'too many values',
        {
          object_types: Array.from(
            { length: COVERAGE_MAX_VALUES + 1 },
            (_, i) => `t${i}`
          ),
        },
      ],
      [
        'a value that is too long',
        { sectors: ['s'.repeat(COVERAGE_MAX_VALUE_LENGTH + 1)] },
      ],
      ['a blank value', { regions: ['   '] }],
      [
        'an object type outside the OpenCTI types',
        { object_types: ['Indicator', 'not-an-opencti-type'] },
      ],
    ])('should reject %s', (_description, declaration) => {
      // Given / When
      const call = () =>
        IntegrationCoverageHelper.assertValidDeclaration(declaration);

      // Then
      expect(call).toThrow(BadRequestErrorCode.InvalidIntegrationCoverage);
    });
  });

  describe('parsing stored values', () => {
    it.each([
      [
        'a JSON array',
        JSON.stringify([MALWARE, INDICATOR]),
        [MALWARE, INDICATOR],
      ],
      ['an already parsed array', [MALWARE], [MALWARE]],
      ['invalid JSON', '{not json', []],
      ['a JSON object', JSON.stringify({ value: MALWARE }), []],
      ['non string items', JSON.stringify([MALWARE, 3, null]), [MALWARE]],
      ['null', null, []],
    ])(
      'should parse a stored list from %s',
      (_description, value, expected) => {
        // Given / When
        const parsed = IntegrationCoverageHelper.parseStoredList(value);

        // Then
        expect(parsed).toEqual(expected);
      }
    );

    it.each([
      ['"false"', 'false', false],
      ['false', false, false],
      ['"true"', 'true', true],
      ['a missing value', null, true],
      ['undefined', undefined, true],
    ])(
      'should read coverage_inferred %s as %s',
      (_description, value, expected) => {
        // Given / When
        const inferred = IntegrationCoverageHelper.parseCoverageInferred(value);

        // Then
        expect(inferred).toBe(expected);
      }
    );

    it('should return null when no coverage metadata is stored', () => {
      // Given
      const record = { [DocumentMetadataKeyCode.IntegrationType]: 'connector' };

      // When
      const stored = IntegrationCoverageHelper.parseStoredCoverage(record);

      // Then
      expect(stored).toBeNull();
    });

    it('should parse the stored coverage', () => {
      // Given
      const record = {
        [DocumentMetadataKeyCode.CoveredObjectTypes]: JSON.stringify([MALWARE]),
        [DocumentMetadataKeyCode.CoveredSectors]: JSON.stringify([FINANCE]),
        [DocumentMetadataKeyCode.CoveredRegions]: JSON.stringify([EUROPE]),
        [DocumentMetadataKeyCode.CoverageInferred]: 'false',
      };

      // When
      const stored = IntegrationCoverageHelper.parseStoredCoverage(record);

      // Then
      expect(stored).toEqual(
        makeCoverage({
          object_types: [MALWARE],
          sectors: [FINANCE],
          regions: [EUROPE],
          inferred: false,
        })
      );
    });
  });

  describe('resolveCoverage', () => {
    it('should keep a non-empty declaration as declared coverage', () => {
      // Given
      const declared = { object_types: ['malware'], sectors: [FINANCE] };

      // When
      const coverage = IntegrationCoverageHelper.resolveCoverage({
        declared,
        existing: makeCoverage({ object_types: [INDICATOR] }),
        inferenceSource: NEUTRAL_SOURCE,
      });

      // Then
      expect(coverage).toEqual(
        makeCoverage({ object_types: [MALWARE], sectors: [FINANCE] })
      );
    });

    it('should preserve stored declared coverage when nothing is declared', () => {
      // Given
      const existing = makeCoverage({ regions: [EUROPE] });

      // When
      const coverage = IntegrationCoverageHelper.resolveCoverage({
        declared: { object_types: [], sectors: [], regions: [] },
        existing,
        inferenceSource: MALWARE_SOURCE,
      });

      // Then
      expect(coverage).toEqual(existing);
    });

    it.each([
      ['nothing is stored', null],
      [
        'the stored coverage is inferred',
        makeCoverage({ object_types: [INDICATOR], inferred: true }),
      ],
      ['the stored declared coverage is empty', makeCoverage()],
    ])('should infer when %s', (_description, existing) => {
      // Given / When
      const coverage = IntegrationCoverageHelper.resolveCoverage({
        existing,
        inferenceSource: MALWARE_SOURCE,
      });

      // Then
      expect(coverage).toEqual(
        makeCoverage({ object_types: [MALWARE], inferred: true })
      );
    });
  });

  describe('resolveAdminCoverage', () => {
    it('should keep the stored declared coverage when no list is submitted', () => {
      // Given
      const existing = makeCoverage({ sectors: [FINANCE] });

      // When
      const coverage = IntegrationCoverageHelper.resolveAdminCoverage({
        input: {},
        existing,
        inferenceSource: MALWARE_SOURCE,
      });

      // Then
      expect(coverage).toEqual(existing);
    });

    it('should merge a partial submission with the stored declared coverage', () => {
      // Given
      const existing = makeCoverage({ sectors: [FINANCE], regions: [EUROPE] });

      // When
      const coverage = IntegrationCoverageHelper.resolveAdminCoverage({
        input: { regions: ['France'] },
        existing,
        inferenceSource: NEUTRAL_SOURCE,
      });

      // Then
      expect(coverage).toEqual(
        makeCoverage({ sectors: [FINANCE], regions: ['France'] })
      );
    });

    it('should return to inference when every list is cleared', () => {
      // Given
      const existing = makeCoverage({ sectors: [FINANCE] });

      // When
      const coverage = IntegrationCoverageHelper.resolveAdminCoverage({
        input: { object_types: [], sectors: [], regions: [] },
        existing,
        inferenceSource: MALWARE_SOURCE,
      });

      // Then
      expect(coverage).toEqual(
        makeCoverage({ object_types: [MALWARE], inferred: true })
      );
    });

    it('should keep the coverage inferred when the inferred values are submitted unchanged', () => {
      // Given
      const existing = makeCoverage({
        object_types: [MALWARE],
        inferred: true,
      });

      // When
      const coverage = IntegrationCoverageHelper.resolveAdminCoverage({
        input: { object_types: ['malware'], sectors: [], regions: [] },
        existing,
        inferenceSource: { name: 'Indicator feed' },
      });

      // Then
      expect(coverage).toEqual(
        makeCoverage({ object_types: [INDICATOR], inferred: true })
      );
    });

    it('should declare the inferred values submitted unchanged when the admin confirms them', () => {
      // Given
      const existing = makeCoverage({
        object_types: [MALWARE],
        inferred: true,
      });

      // When
      const coverage = IntegrationCoverageHelper.resolveAdminCoverage({
        input: { object_types: ['malware'], sectors: [], regions: [] },
        existing,
        inferenceSource: { name: 'Indicator feed' },
        confirmed: true,
      });

      // Then
      expect(coverage).toEqual(
        makeCoverage({ object_types: [MALWARE], inferred: false })
      );
    });

    it('should declare the coverage when the admin edits inferred values', () => {
      // Given
      const existing = makeCoverage({
        object_types: [MALWARE],
        inferred: true,
      });

      // When
      const coverage = IntegrationCoverageHelper.resolveAdminCoverage({
        input: { object_types: [MALWARE, INDICATOR], sectors: [], regions: [] },
        existing,
        inferenceSource: MALWARE_SOURCE,
      });

      // Then
      expect(coverage).toEqual(
        makeCoverage({ object_types: [MALWARE, INDICATOR], inferred: false })
      );
    });
  });

  describe('metadata conversion', () => {
    it('should drop coverage entries sent by a client', () => {
      // Given
      const metadata = [
        { key: DocumentMetadataKeyCode.IntegrationType, value: 'connector' },
        { key: DocumentMetadataKeyCode.CoveredObjectTypes, value: 'garbage' },
        { key: DocumentMetadataKeyCode.CoverageInferred, value: 'false' },
      ];

      // When
      const kept = IntegrationCoverageHelper.withoutCoverageMetadata(metadata);

      // Then
      expect(kept).toEqual([
        { key: DocumentMetadataKeyCode.IntegrationType, value: 'connector' },
      ]);
    });

    it('should serialize the coverage into metadata entries', () => {
      // Given
      const coverage = makeCoverage({
        object_types: [MALWARE],
        regions: [EUROPE],
        inferred: true,
      });

      // When
      const entries = IntegrationCoverageHelper.toMetadataEntries(coverage);

      // Then
      expect(entries).toEqual([
        {
          key: DocumentMetadataKeyCode.CoveredObjectTypes,
          value: JSON.stringify([MALWARE]),
        },
        { key: DocumentMetadataKeyCode.CoveredSectors, value: '[]' },
        {
          key: DocumentMetadataKeyCode.CoveredRegions,
          value: JSON.stringify([EUROPE]),
        },
        { key: DocumentMetadataKeyCode.CoverageInferred, value: 'true' },
      ]);
    });
  });
});
