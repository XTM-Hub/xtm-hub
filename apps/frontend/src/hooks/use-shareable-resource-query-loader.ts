import { DocumentsListQuery } from '@/components/service/document/document.graphql';
import { FacetDocumentListQuery } from '@/components/service/document/public-document.graphql';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentFacets } from '@generated/documentFacets.graphql';
import {
  documentsQuery,
  documentsQuery$variables,
} from '@generated/documentsQuery.graphql';
import { useEffect } from 'react';
import { useQueryLoader } from 'react-relay';

export type UseShareableResourceQueryLoaderParams = Omit<
  documentsQuery$variables,
  'count' | 'cursor'
> & {
  /** Page size read from `useServiceListLocalStorage`. */
  pageSize: number;
  /**
   * The documents query derives the type server-side from the instance's
   * service definition, but LoadDocumentFacetInput takes it explicitly —
   * ShareableResourceType values ARE the backend document type strings.
   */
  documentType: ShareableResourceType;
};

/**
 * Mutualizes the `useQueryLoader`/`loadQuery` boilerplate duplicated across every
 * shareable-resource page-loader: loading the initial page of documents AND the
 * matching facet counts, re-triggered together from a single effect so the list
 * and its counts can never diverge.
 */
export const useShareableResourceQueryLoader = ({
  pageSize,
  orderBy,
  orderMode,
  serviceInstanceId,
  searchTerm,
  logicalFilters,
  documentType,
}: UseShareableResourceQueryLoaderParams) => {
  const [queryRef, loadQuery] =
    useQueryLoader<documentsQuery>(DocumentsListQuery);
  const [queryRefFacet, loadQueryFacet] = useQueryLoader<documentFacets>(
    FacetDocumentListQuery
  );

  useEffect(() => {
    loadQuery(
      {
        count: pageSize,
        orderBy,
        orderMode,
        serviceInstanceId,
        searchTerm,
        logicalFilters,
      },
      { fetchPolicy: 'store-and-network' }
    );
    loadQueryFacet(
      {
        input: {
          serviceInstanceId,
          documentType,
          searchTerm,
          logicalFilters,
        },
      },
      { fetchPolicy: 'store-and-network' }
    );
  }, [
    loadQuery,
    loadQueryFacet,
    pageSize,
    orderBy,
    orderMode,
    serviceInstanceId,
    searchTerm,
    logicalFilters,
    documentType,
  ]);

  return { queryRef, queryRefFacet };
};
