import { toServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useDocumentFacetsQuery } from '@graphql/generated';
import { useMemo } from 'react';

interface UseCoverageFacetCountsParams {
  serviceInstanceId: string;
  documentType: string;
  enabled: boolean;
}

/**
 * Facet counts of the whole catalog, without any filter: the values offered by
 * the coverage fields outside the list page (object types, sectors, regions).
 */
export const useCoverageFacetCounts = ({
  serviceInstanceId,
  documentType,
  enabled,
}: UseCoverageFacetCountsParams) => {
  const { data } = useDocumentFacetsQuery(
    portalGraphqlClient,
    {
      input: {
        serviceInstanceId,
        documentType,
        searchTerm: '',
        logicalFilters: null,
        restrictToActiveDocuments: false,
      },
    },
    { enabled }
  );

  return useMemo(
    () =>
      data === undefined
        ? undefined
        : toServiceListFacetCounts(data.documentFacets),
    [data]
  );
};
