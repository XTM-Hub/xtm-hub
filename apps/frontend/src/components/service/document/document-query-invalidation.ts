import { documentFacetsKeys } from '@graphql/document/document-facets.keys';
import {
  documentKeys,
  publicDocumentKeys,
} from '@graphql/document/document.keys';
import type { QueryClient } from '@tanstack/react-query';

const invalidateDocumentLists = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: documentKeys.listAll() });
  void queryClient.invalidateQueries({ queryKey: documentFacetsKeys.all() });
  void queryClient.invalidateQueries({
    queryKey: publicDocumentKeys.listAll(),
  });
};

/**
 * The library list, the detail page, the facet counts of the filters and the
 * public list all read the same documents, and the `QueryClient`'s `staleTime`
 * keeps them from refetching on their own: a create or an update has to
 * invalidate every one of them.
 */
export const invalidateDocumentQueries = (queryClient: QueryClient) => {
  invalidateDocumentLists(queryClient);
  void queryClient.invalidateQueries({ queryKey: documentKeys.detailAll() });
};

/**
 * Same as {@link invalidateDocumentQueries}, except the detail queries are only
 * marked stale: the page showing the deleted document is about to navigate
 * away, and refetching it would fail on a document that no longer exists.
 */
export const invalidateDocumentQueriesAfterDelete = (
  queryClient: QueryClient
) => {
  invalidateDocumentLists(queryClient);
  void queryClient.invalidateQueries({
    queryKey: documentKeys.detailAll(),
    refetchType: 'none',
  });
};
