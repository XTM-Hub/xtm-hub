import { LoadDocumentFacetInput } from '../../../__generated__/resolvers-types';
import { FacetDomain } from './facet.domain';

export const FacetApp = {
  loadDocumentFacets: async ({
    serviceInstanceId,
    searchTerm,
    logicalFilters,
    documentType,
  }: LoadDocumentFacetInput) => {
    return FacetDomain.loadDocumentFacets({
      serviceInstanceId,
      documentType,
      searchTerm,
      logicalFilters,
    });
  },
};
