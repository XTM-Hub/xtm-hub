import { describe, expect, it, vi } from 'vitest';
import { LoadDocumentFacetInput } from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { FacetApp } from './facet.app';
import { FacetDomain } from './facet.domain';

describe('facet.app', () => {
  it('should delegate loadDocumentFacets to FacetDomain', async () => {
    // Given
    const serviceInstanceId = 'service-instance-id' as ServiceInstanceId;
    const input: LoadDocumentFacetInput = {
      serviceInstanceId,
      documentType: 'opencti_integration',
      searchTerm: 'connector',
      logicalFilters: null,
    };
    const expectedFacets = {
      integration_type: [{ value: 'connector', count: 3 }],
      license_type: [],
      manager_supported: [],
      verified: [],
      product_version: [],
      solution_category: [],
      use_case: [],
      entity_type: [],
    };
    vi.spyOn(FacetDomain, 'loadDocumentFacets').mockResolvedValue(
      expectedFacets
    );

    // When
    const result = await FacetApp.loadDocumentFacets(input);

    // Then
    expect(result).toEqual(expectedFacets);
    expect(FacetDomain.loadDocumentFacets).toHaveBeenCalledWith(input);
  });

  it('should support nullable optional filters', async () => {
    // Given
    const input: LoadDocumentFacetInput = {
      serviceInstanceId: 'service-instance-id' as ServiceInstanceId,
      searchTerm: null,
      logicalFilters: null,
      documentType: null,
    };
    const expectedFacets = {
      integration_type: [],
      license_type: [],
      manager_supported: [],
      verified: [],
      product_version: [],
      solution_category: [],
      use_case: [],
      entity_type: [],
    };
    vi.spyOn(FacetDomain, 'loadDocumentFacets').mockResolvedValue(
      expectedFacets
    );

    // When
    const result = await FacetApp.loadDocumentFacets(input);

    // Then
    expect(result).toEqual(expectedFacets);
    expect(FacetDomain.loadDocumentFacets).toHaveBeenCalledWith(input);
  });
});
