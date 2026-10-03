import { describe, expect, it } from 'vitest';
import { IntegrationType } from '../../../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../../../utils/error/error.code';
import {
  COVERAGE_MAX_VALUE_LENGTH,
  COVERAGE_MAX_VALUES,
  COVERAGE_SEARCH_DEFAULT_FIRST,
  COVERAGE_SEARCH_MAX_FIRST,
  COVERAGE_SEARCH_MAX_TERM_LENGTH,
  IntegrationCoverage,
  StoredIntegrationCoverage,
} from './integration-coverage.model';
import {
  IntegrationCoverageSearchHelper,
  RankedCoverageMatch,
} from './integration-coverage.search.helper';

const MALWARE = 'Malware';
const INDICATOR = 'Indicator';
const FINANCE = 'Finance';
const ENERGY = 'Energy';
const FRANCE = 'France';
const GERMANY = 'Germany';

const makeRequest = (
  overrides: Partial<IntegrationCoverage> = {}
): IntegrationCoverage => ({
  object_types: [],
  sectors: [],
  regions: [],
  ...overrides,
});

const makeCoverage = (
  overrides: Partial<StoredIntegrationCoverage> = {}
): StoredIntegrationCoverage => ({
  object_types: [],
  sectors: [],
  regions: [],
  inferred: false,
  ...overrides,
});

const makeRanked = (
  overrides: Partial<RankedCoverageMatch> = {}
): RankedCoverageMatch => ({
  id: 'id-a',
  slug: 'slug-a',
  name: 'Name A',
  score: 0.5,
  download_number: 0,
  ...overrides,
});

describe('IntegrationCoverageSearchHelper', () => {
  describe('clampFirst', () => {
    it.each([
      [null, COVERAGE_SEARCH_DEFAULT_FIRST],
      [undefined, COVERAGE_SEARCH_DEFAULT_FIRST],
      [0, 1],
      [-5, 1],
      [1, 1],
      [COVERAGE_SEARCH_MAX_FIRST, COVERAGE_SEARCH_MAX_FIRST],
      [COVERAGE_SEARCH_MAX_FIRST + 1, COVERAGE_SEARCH_MAX_FIRST],
      [10_000, COVERAGE_SEARCH_MAX_FIRST],
    ])('should clamp first=%s to %s', (first, expected) => {
      // Given / When
      const clamped = IntegrationCoverageSearchHelper.clampFirst(first);

      // Then
      expect(clamped).toBe(expected);
    });
  });

  describe('normalizeSearchInput', () => {
    it('should canonicalize, deduplicate and trim the requested values', () => {
      // Given
      const input = {
        objectTypes: ['malware', ' Malware ', 'ipv4-addr'],
        sectors: ['finance'],
        regions: [' France '],
        integrationTypes: [IntegrationType.Connector, IntegrationType.Connector],
        searchTerm: '  ',
      };

      // When
      const request = IntegrationCoverageSearchHelper.normalizeSearchInput(input);

      // Then
      expect(request).toEqual({
        object_types: [MALWARE, 'IPv4-Addr'],
        sectors: [FINANCE],
        regions: [FRANCE],
        integrationTypes: [IntegrationType.Connector],
        searchTerm: undefined,
        first: COVERAGE_SEARCH_DEFAULT_FIRST,
      });
    });

    it.each([
      [
        'too many object types',
        {
          objectTypes: Array.from(
            { length: COVERAGE_MAX_VALUES + 1 },
            (_, index) => `type-${index}`
          ),
        },
      ],
      [
        'a sector that is too long',
        { sectors: ['s'.repeat(COVERAGE_MAX_VALUE_LENGTH + 1)] },
      ],
      ['a blank region', { regions: [''] }],
      [
        'a search term that is too long',
        { searchTerm: 'x'.repeat(COVERAGE_SEARCH_MAX_TERM_LENGTH + 1) },
      ],
    ])('should reject %s', (_description, input) => {
      // Given / When
      const call = () =>
        IntegrationCoverageSearchHelper.normalizeSearchInput(input);

      // Then
      expect(call).toThrow(BadRequestErrorCode.InvalidCoverageSearchInput);
    });

    it('should accept the maximum number of values of the maximum length', () => {
      // Given
      const input = {
        sectors: Array.from(
          { length: COVERAGE_MAX_VALUES },
          (_, index) =>
            `${index}`.padEnd(COVERAGE_MAX_VALUE_LENGTH, 'x')
        ),
      };

      // When
      const request = IntegrationCoverageSearchHelper.normalizeSearchInput(input);

      // Then
      expect(request.sectors).toHaveLength(COVERAGE_MAX_VALUES);
    });
  });

  describe('scoreCoverage', () => {
    it.each([
      [
        'every requested family fully covered',
        makeRequest({ object_types: [MALWARE], sectors: [FINANCE] }),
        makeCoverage({ object_types: [MALWARE], sectors: [FINANCE] }),
        1,
      ],
      [
        'half of the object types covered',
        makeRequest({ object_types: [MALWARE, INDICATOR] }),
        makeCoverage({ object_types: [MALWARE] }),
        0.5,
      ],
      [
        'one family covered out of two',
        makeRequest({ object_types: [MALWARE], sectors: [ENERGY] }),
        makeCoverage({ object_types: [MALWARE], sectors: [FINANCE] }),
        0.5,
      ],
      [
        'a fully covered inferred coverage',
        makeRequest({ object_types: [MALWARE] }),
        makeCoverage({ object_types: [MALWARE], inferred: true }),
        0.6,
      ],
      [
        'a half covered inferred coverage',
        makeRequest({ object_types: [MALWARE, INDICATOR] }),
        makeCoverage({ object_types: [MALWARE], inferred: true }),
        0.3,
      ],
      [
        'a case-insensitive match',
        makeRequest({ object_types: [MALWARE] }),
        makeCoverage({ object_types: ['malware'] }),
        1,
      ],
      [
        'nothing covered',
        makeRequest({ sectors: [ENERGY] }),
        makeCoverage({ sectors: [FINANCE] }),
        0,
      ],
      ['no requested facet', makeRequest(), makeCoverage(), 0],
    ])(
      'should score %s',
      (_description, request, coverage, expectedScore) => {
        // Given / When
        const { score } = IntegrationCoverageSearchHelper.scoreCoverage(
          request,
          coverage
        );

        // Then
        expect(score).toBe(expectedScore);
      }
    );

    it.each([['Global'], ['Worldwide'], ['worldwide']])(
      'should match every requested region with a %s coverage',
      (globalRegion) => {
        // Given
        const request = makeRequest({ regions: [FRANCE, GERMANY] });
        const coverage = makeCoverage({ regions: [globalRegion] });

        // When
        const result = IntegrationCoverageSearchHelper.scoreCoverage(
          request,
          coverage
        );

        // Then
        expect(result).toEqual({
          score: 1,
          matched_object_types: [],
          matched_sectors: [],
          matched_regions: [FRANCE, GERMANY],
        });
      }
    );

    it('should not match a requested Global region with a country coverage', () => {
      // Given
      const request = makeRequest({ regions: ['Global'] });
      const coverage = makeCoverage({ regions: [FRANCE] });

      // When
      const { matched_regions } = IntegrationCoverageSearchHelper.scoreCoverage(
        request,
        coverage
      );

      // Then
      expect(matched_regions).toEqual([]);
    });
  });

  describe('compareRankedMatches', () => {
    it('should order by score, then downloads, then name, then slug', () => {
      // Given
      const matches = [
        makeRanked({ id: '1', name: 'Bravo', slug: 'b', score: 0.5 }),
        makeRanked({ id: '2', name: 'Alpha', slug: 'a2', score: 0.5 }),
        makeRanked({ id: '3', name: 'Zulu', slug: 'z', score: 1 }),
        makeRanked({
          id: '4',
          name: 'Yankee',
          slug: 'y',
          score: 0.5,
          download_number: 10,
        }),
        makeRanked({ id: '5', name: 'Alpha', slug: 'a1', score: 0.5 }),
      ];

      // When
      const ordered = [...matches]
        .sort(IntegrationCoverageSearchHelper.compareRankedMatches)
        .map(({ id }) => id);

      // Then
      expect(ordered).toEqual(['3', '4', '5', '2', '1']);
    });
  });

  describe('buildRegionMatchKeys', () => {
    it('should add the global values to the lowercased requested regions', () => {
      // Given
      const regions = [FRANCE];

      // When
      const keys = IntegrationCoverageSearchHelper.buildRegionMatchKeys(regions);

      // Then
      expect(keys).toEqual(['france', 'global', 'worldwide']);
    });
  });
});
