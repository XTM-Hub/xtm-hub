import { documentFacets$data } from '@generated/documentFacets.graphql';

export interface ServiceListFacetCounts {
  useCase?: Record<string, number>;
  entityType?: Record<string, number>;
  integrationType?: Record<string, number>;
  managerSupported?: Record<string, number>;
  verified?: Record<string, number>;
  productVersion?: Record<string, number>;
  solutionCategory?: Record<string, number>;
  licenseType?: Record<string, number>;
}

type FacetData = documentFacets$data['documentFacets'];

const toMap = (values: ReadonlyArray<{ value: string; count: number }>) =>
  Object.fromEntries(values.map((item) => [item.value, item.count] as const));

/** Single source of truth for turning the GraphQL Facet payload into the
 *  per-filter count maps consumed by both the public and private lists. */
export const toServiceListFacetCounts = (
  facets: FacetData
): ServiceListFacetCounts => ({
  integrationType: toMap(facets?.integration_type ?? []),
  licenseType: toMap(facets?.license_type ?? []),
  managerSupported: toMap(facets?.manager_supported ?? []),
  verified: toMap(facets?.verified ?? []),
  productVersion: toMap(facets?.product_version ?? []),
  solutionCategory: toMap(facets?.solution_category ?? []),
  useCase: toMap(facets?.use_case ?? []),
  entityType: toMap(facets?.entity_type ?? []),
});
