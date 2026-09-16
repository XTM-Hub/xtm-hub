import { DocumentsListQuery } from '@/components/service/document/document.graphql';
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
};

/**
 * Mutualizes the `useQueryLoader`/`loadQuery` boilerplate duplicated across every
 * shareable-resource page-loader: loading the initial page of documents.
 *
 * The matching facet counts are fetched separately via `useDocumentFacetsQuery`
 * (react-query) directly in the components that render them, so the two are no
 * longer guaranteed to land in the same tick — react-query refetches whenever its
 * own variables change, keeping them consistent, but a loading-state flicker
 * between the list and its counts is possible.
 */
export const useShareableResourceQueryLoader = ({
  pageSize,
  orderBy,
  orderMode,
  serviceInstanceId,
  searchTerm,
  logicalFilters,
}: UseShareableResourceQueryLoaderParams) => {
  const [queryRef, loadQuery] =
    useQueryLoader<documentsQuery>(DocumentsListQuery);

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
  }, [
    loadQuery,
    pageSize,
    orderBy,
    orderMode,
    serviceInstanceId,
    searchTerm,
    logicalFilters,
  ]);

  return { queryRef };
};
