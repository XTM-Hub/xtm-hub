import {
  invalidateDocumentQueries,
  invalidateDocumentQueriesAfterDelete,
} from '@/components/service/document/document-query-invalidation';
import { documentFacetsKeys } from '@graphql/document/document-facets.keys';
import {
  documentKeys,
  publicDocumentKeys,
} from '@graphql/document/document.keys';
import { QueryClient } from '@tanstack/react-query';

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
  it.each`
    key                             | description
    ${documentKeys.listAll()}       | ${'the library list'}
    ${documentFacetsKeys.all()}     | ${'the facet counts of the filters'}
    ${publicDocumentKeys.listAll()} | ${'the public list'}
  `('should invalidate $description', ({ key }) => {
    const { queryClient, invalidateQueries } = spyOnInvalidation();

    invalidateDocumentQueriesAfterDelete(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
  });

  it('should mark the detail queries stale without refetching the page being left', () => {
    const { queryClient, invalidateQueries } = spyOnInvalidation();

    invalidateDocumentQueriesAfterDelete(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: documentKeys.detailAll(),
      refetchType: 'none',
    });
  });
});
