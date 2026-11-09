import {
  Facet,
  LoadDocumentFacetInput,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { isUserRestrictedToPublishedDocument } from '../document.security';
import { groupFacetsBySignature } from './facet.grouping.utils';
import { loadFacetsInSingleQuery } from './facet.union-query';

export const FacetDomain = {
  loadDocumentFacets: async (input: LoadDocumentFacetInput): Promise<Facet> => {
    const user = requestContext.get()?.user;
    const restrictToPublished =
      input.restrictToPublishedDocuments === true ||
      input.restrictToActiveDocuments === true ||
      !user ||
      (await isUserRestrictedToPublishedDocument(
        user,
        input.serviceInstanceId
      ));

    const groups = groupFacetsBySignature(input.logicalFilters);
    const byField = await loadFacetsInSingleQuery(
      groups,
      input,
      restrictToPublished
    );

    return {
      integration_type: byField.integration_type ?? [],
      license_type: byField.license_type ?? [],
      manager_supported: byField.manager_supported ?? [],
      verified: byField.verified ?? [],
      product_version: byField.product_version ?? [],
      solution_category: byField.solution_category ?? [],
      use_case: byField.use_case ?? [],
      entity_type: byField.entity_type ?? [],
    };
  },
};
