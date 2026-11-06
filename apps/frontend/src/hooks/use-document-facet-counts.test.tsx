import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDocumentFacetCounts } from './use-document-facet-counts';

const { mockUseDocumentFacetsQuery } = vi.hoisted(() => ({
  mockUseDocumentFacetsQuery: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useDocumentFacetsQuery: mockUseDocumentFacetsQuery,
}));

vi.mock('@/hooks/use-logical-filters-from-storage', () => ({
  useLogicalFiltersFromStorage: () => ({}),
}));

const SERVICE_INSTANCE_ID = 'service-instance-1';
const DOCUMENT_TYPE = 'opencti_custom_dashboard';

const renderFacetCounts = (restrictToPublishedDocuments: boolean) =>
  renderHook(() =>
    useDocumentFacetCounts({
      serviceInstanceId: SERVICE_INSTANCE_ID,
      documentType: DOCUMENT_TYPE,
      search: '',
      serviceInstanceSlug: ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
      restrictToPublishedDocuments,
      labels: {},
      entityTypes: {},
      deployable: {},
      verified: {},
      integrationTypes: {},
      productVersions: {},
      licenseTypes: {},
      solutionCategories: {},
    })
  );

describe('useDocumentFacetCounts', () => {
  it.each([true, false])(
    'should send restrictToPublishedDocuments=%s to the facets query',
    (restrictToPublishedDocuments) => {
      // Given the scope asked by the page

      // When
      renderFacetCounts(restrictToPublishedDocuments);

      // Then
      expect(mockUseDocumentFacetsQuery).toHaveBeenCalledWith(
        expect.anything(),
        {
          input: expect.objectContaining({
            serviceInstanceId: SERVICE_INSTANCE_ID,
            documentType: DOCUMENT_TYPE,
            restrictToPublishedDocuments,
          }),
        },
        expect.anything()
      );
    }
  );
});
