import {
  invalidateDocumentQueries,
  invalidateDocumentQueriesAfterDelete,
} from '@/components/service/document/document-query-invalidation';
import { documentFacetsKeys } from '@graphql/document/document-facets.keys';
import {
  documentKeys,
  publicDocumentKeys,
} from '@graphql/document/document.keys';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

const spyOnInvalidation = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  return { queryClient, invalidateQueries };
};

describe('invalidateDocumentQueries', () => {
  it.each`
    key                             | description
    ${documentKeys.listAll()}       | ${'the library list'}
    ${documentKeys.detailAll()}     | ${'the document detail'}
    ${documentFacetsKeys.all()}     | ${'the facet counts of the filters'}
    ${publicDocumentKeys.listAll()} | ${'the public list'}
  `('should invalidate $description', ({ key }) => {
    const { queryClient, invalidateQueries } = spyOnInvalidation();

    invalidateDocumentQueries(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
  });
});

describe('invalidateDocumentQueriesAfterDelete', () => {
  const deleted = { documentId: 'document-1', serviceInstanceId: 'instance-1' };

  it.each`
    key                             | description
    ${documentKeys.listAll()}       | ${'the library list'}
    ${documentFacetsKeys.all()}     | ${'the facet counts of the filters'}
    ${publicDocumentKeys.listAll()} | ${'the public list'}
  `('should invalidate $description', ({ key }) => {
    const { queryClient, invalidateQueries } = spyOnInvalidation();

    invalidateDocumentQueriesAfterDelete(queryClient, deleted);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
  });

  it('should leave the details of the other documents alone', () => {
    const { queryClient, invalidateQueries } = spyOnInvalidation();

    invalidateDocumentQueriesAfterDelete(queryClient, deleted);

    expect(invalidateQueries).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: documentKeys.detailAll() })
    );
  });

  describe('the cached detail of the deleted document', () => {
    const detailKey = documentKeys.detail(deleted);
    const otherDetailKey = documentKeys.detail({
      ...deleted,
      documentId: 'document-2',
    });

    const seedDetails = (queryClient: QueryClient) => {
      queryClient.setQueryData(detailKey, { document: { id: 'document-1' } });
      queryClient.setQueryData(otherDetailKey, {
        document: { id: 'document-2' },
      });
    };

    it('should be removed at once when no page reads it', () => {
      const queryClient = new QueryClient();
      seedDetails(queryClient);

      invalidateDocumentQueriesAfterDelete(queryClient, deleted);

      expect(queryClient.getQueryData(detailKey)).toBeUndefined();
      expect(queryClient.getQueryData(otherDetailKey)).toBeDefined();
    });

    it('should be kept while a page reads it, then removed once the page is left', () => {
      const queryClient = new QueryClient();
      seedDetails(queryClient);
      const observer = new QueryObserver(queryClient, {
        queryKey: detailKey,
        queryFn: () => Promise.resolve(null),
        enabled: false,
      });
      const unsubscribe = observer.subscribe(() => {});

      invalidateDocumentQueriesAfterDelete(queryClient, deleted);
      expect(queryClient.getQueryData(detailKey)).toBeDefined();

      unsubscribe();

      expect(queryClient.getQueryData(detailKey)).toBeUndefined();
      expect(queryClient.getQueryData(otherDetailKey)).toBeDefined();
    });

    it('should do nothing when the detail was never loaded', () => {
      const queryClient = new QueryClient();

      expect(() =>
        invalidateDocumentQueriesAfterDelete(queryClient, deleted)
      ).not.toThrow();
    });
  });
});
