import { describe, expect, it } from 'vitest';
import { toServiceListFacetCounts } from './service-list-facet-counts';

const bucket = (value: string, count: number) => ({ value, count });

describe('toServiceListFacetCounts', () => {
  it('should map the coverage facets to count maps', () => {
    // Given
    const facets = {
      integration_type: [bucket('connector', 4)],
      license_type: [],
      manager_supported: [],
      verified: [],
      product_version: [],
      solution_category: [],
      use_case: [],
      entity_type: [],
      object_type: [bucket('Malware', 3), bucket('Indicator', 1)],
      sector: [bucket('Finance', 2)],
      region: [bucket('France', 1)],
    };

    // When
    const counts = toServiceListFacetCounts(facets);

    // Then
    expect(counts.objectType).toEqual({ Malware: 3, Indicator: 1 });
    expect(counts.sector).toEqual({ Finance: 2 });
    expect(counts.region).toEqual({ France: 1 });
    expect(counts.integrationType).toEqual({ connector: 4 });
  });

  it('should return empty maps without facets', () => {
    const counts = toServiceListFacetCounts(undefined);
    expect(counts.objectType).toEqual({});
    expect(counts.sector).toEqual({});
    expect(counts.region).toEqual({});
  });
});
