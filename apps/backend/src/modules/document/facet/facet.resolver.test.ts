import { GraphQLResolveInfo } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { PortalContext } from '../../../model/portal-context';
import { FacetApp } from './facet.app';
import resolver from './facet.resolver';

describe('facet.resolver', () => {
  it('should delegate documentFacets query to FacetApp', async () => {
    // Given
    const expectedFacets = {
      integration_type: [{ value: 'connector', count: 1 }],
      license_type: [],
      manager_supported: [],
      verified: [],
      product_version: [],
      solution_category: [],
      use_case: [],
      entity_type: [],
    };
    vi.spyOn(FacetApp, 'loadDocumentFacets').mockResolvedValue(expectedFacets);

    // When
    const result = await resolver.Query!.documentFacets!(
      {},
      {
        input: {
          serviceInstanceId: 'service-instance-id' as ServiceInstanceId,
          searchTerm: null,
          logicalFilters: null,
          documentType: null,
        },
      },
      {} as PortalContext,
      {} as GraphQLResolveInfo
    );

    // Then
    expect(result).toEqual(expectedFacets);
  });
});
