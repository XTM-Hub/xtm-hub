import { describe, expect, it } from 'vitest';
import {
  FilterKey,
  LogicalFilterInput,
  LogicalOperator,
} from '../../../__generated__/resolvers-types';
import {
  canonicalSignature,
  FACET_SPECS,
  groupFacetsBySignature,
} from './facet.grouping.utils';

const NON_FACET_FILTER: LogicalFilterInput = {
  leaf: { key: FilterKey.Slug, value: ['some-slug'] },
};

const filterOn = (key: FilterKey, value: string[]): LogicalFilterInput => ({
  leaf: { key, value },
});

const andOf = (children: LogicalFilterInput[]): LogicalFilterInput => ({
  operator: LogicalOperator.And,
  children,
});

describe('facet.grouping.utils', () => {
  describe('groupFacetsBySignature', () => {
    it.each([
      ['no logical filters at all', null, 1],
      ['a single non-facet filter (slug)', NON_FACET_FILTER, 1],
      [
        'a single facet filter (integration_type)',
        filterOn(FilterKey.IntegrationType, ['connector']),
        2,
      ],
      [
        'two facet filters (integration_type + label)',
        andOf([
          filterOn(FilterKey.IntegrationType, ['connector']),
          filterOn(FilterKey.Label, ['use-case-1']),
        ]),
        3,
      ],
      [
        'all 8 facet keys filtered',
        andOf([
          filterOn(FilterKey.IntegrationType, ['connector']),
          filterOn(FilterKey.LicenseType, ['free']),
          filterOn(FilterKey.ManagerSupported, ['true']),
          filterOn(FilterKey.Verified, ['true']),
          filterOn(FilterKey.ProductVersion, ['1.0.0']),
          filterOn(FilterKey.SolutionCategory, ['edr']),
          filterOn(FilterKey.Label, ['use-case-1']),
          filterOn(FilterKey.EntityType, ['Malware']),
        ]),
        8,
      ],
    ])(
      'should produce %i signature group(s) for %s',
      (_description, logicalFilters, expectedGroupCount) => {
        // Given / When
        const groups = groupFacetsBySignature(
          logicalFilters as LogicalFilterInput | null
        );

        // Then
        expect(groups).toHaveLength(expectedGroupCount);
      }
    );

    it('should place every FACET_SPEC in exactly one group covering all 8 fields', () => {
      // Given / When
      const groups = groupFacetsBySignature(null);

      // Then
      const allFieldsInGroups = groups.flatMap((group) =>
        group.specs.map((spec) => spec.field)
      );
      expect(allFieldsInGroups).toHaveLength(FACET_SPECS.length);
      expect(new Set(allFieldsInGroups)).toEqual(
        new Set(FACET_SPECS.map((spec) => spec.field))
      );
    });

    it('should merge two specs whose stripped filter never referenced either facet key', () => {
      // Given — a filter that touches neither integration_type nor license_type
      const logicalFilters = filterOn(FilterKey.Verified, ['true']);

      // When
      const groups = groupFacetsBySignature(logicalFilters);
      const integrationTypeGroup = groups.find((group) =>
        group.specs.some((spec) => spec.field === 'integration_type')
      );
      const licenseTypeGroup = groups.find((group) =>
        group.specs.some((spec) => spec.field === 'license_type')
      );

      // Then
      expect(integrationTypeGroup).toBe(licenseTypeGroup);
    });
  });

  describe('canonicalSignature', () => {
    it('should return the same signature for structurally identical ASTs', () => {
      // Given
      const first = andOf([
        filterOn(FilterKey.IntegrationType, ['connector']),
        filterOn(FilterKey.Verified, ['true']),
      ]);
      const second = andOf([
        filterOn(FilterKey.IntegrationType, ['connector']),
        filterOn(FilterKey.Verified, ['true']),
      ]);

      // When / Then
      expect(canonicalSignature(first)).toEqual(canonicalSignature(second));
    });

    it('should return different signatures for undefined vs AND operator on otherwise identical children', () => {
      const children = [
        filterOn(FilterKey.IntegrationType, ['connector']),
        filterOn(FilterKey.Verified, ['true']),
      ];
      const withoutOperator: LogicalFilterInput = { children };
      const withAndOperator: LogicalFilterInput = {
        operator: LogicalOperator.And,
        children,
      };

      // When / Then
      expect(canonicalSignature(withoutOperator)).not.toEqual(
        canonicalSignature(withAndOperator)
      );
    });

    it('should return different signatures when leaf value order differs (conservative, no sorting)', () => {
      // Given
      const ascending = filterOn(FilterKey.IntegrationType, [
        'connector',
        'csv_feed',
      ]);
      const descending = filterOn(FilterKey.IntegrationType, [
        'csv_feed',
        'connector',
      ]);

      // When / Then
      expect(canonicalSignature(ascending)).not.toEqual(
        canonicalSignature(descending)
      );
    });

    it('should return different signatures for AND vs OR with identical children', () => {
      // Given
      const children = [
        filterOn(FilterKey.IntegrationType, ['connector']),
        filterOn(FilterKey.Verified, ['true']),
      ];

      // When / Then
      expect(
        canonicalSignature({ operator: LogicalOperator.And, children })
      ).not.toEqual(
        canonicalSignature({ operator: LogicalOperator.Or, children })
      );
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])(
      'should return the same signature for %s logical filters',
      (_label, value) => {
        // Given / When / Then
        expect(canonicalSignature(value)).toEqual(canonicalSignature(null));
      }
    );
  });
});
