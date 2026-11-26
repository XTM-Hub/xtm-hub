import { documentFacetsKeys } from '@graphql/document/document-facets.keys';
import {
  documentKeys,
  publicDocumentKeys,
} from '@graphql/document/document.keys';
import type { DocumentDetailQueryVariables } from '@graphql/generated';
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
 * Drops the cached detail of a deleted document as soon as nothing reads it.
 * Removing it while the page showing it is still mounted would make that page
 * rebuild the query and fetch a document that no longer exists, so the removal
 * waits for the page to be left; coming back to the URL then finds no stale
 * copy of the deleted document to flash.
 */
const removeDeletedDocumentDetail = (
  queryClient: QueryClient,
  variables: DocumentDetailQueryVariables
) => {
  const queryKey = documentKeys.detail(variables);
  const queryCache = queryClient.getQueryCache();
  const query = queryCache.find({ queryKey, exact: true });
  if (!query) {
    return;
  }
  if (query.getObserversCount() === 0) {
    queryClient.removeQueries({ queryKey, exact: true });
    return;
  }

  const unsubscribe = queryCache.subscribe((event) => {
    if (
      event.type === 'observerRemoved' &&
      event.query === query &&
      query.getObserversCount() === 0
    ) {
      unsubscribe();
      queryClient.removeQueries({ queryKey, exact: true });
    }
  });
};

/**
 * Same as {@link invalidateDocumentQueries} for a deleted document: the other
 * documents are untouched, so only the lists are refreshed, and the detail of
 * the deleted one is dropped once its page is left.
 */
export const invalidateDocumentQueriesAfterDelete = (
  queryClient: QueryClient,
  deleted: DocumentDetailQueryVariables
) => {
  invalidateDocumentLists(queryClient);
  removeDeletedDocumentDetail(queryClient, deleted);
};
