import { Resolvers } from '../../../../../__generated__/resolvers-types';
import { UnknownErrorCode } from '../../../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../../../utils/error/error.mapping';
import { selectedSubFieldNames } from '../../../../../utils/graphql-selection.util';
import { IntegrationCoverageApp } from './integration-coverage.app';
import { isCoverageFacetKey } from './integration-coverage.domain';
import { KNOWN_OBJECT_TYPES } from './integration-coverage.inference';
import { IntegrationCoverageRateLimit } from './integration-coverage.rate-limit';

const resolvers: Resolvers = {
  Query: {
    integrationsByCoverage: async (_, { input }, context, info) => {
      try {
        // Each facet costs an aggregation: only the selected ones are computed, at a limited rate per caller
        const facetKeys = selectedSubFieldNames(info, 'facets').filter(
          isCoverageFacetKey
        );
        if (facetKeys.length > 0) {
          IntegrationCoverageRateLimit.assertFacetsAllowed({
            userId: context.user?.id,
            ip: context.req?.ip,
          });
        }
        return await IntegrationCoverageApp.searchIntegrationsByCoverage(
          input,
          { facetKeys }
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.IntegrationCoverageSearchError
        );
      }
    },
    integrationCoverageObjectTypes: () => [...KNOWN_OBJECT_TYPES],
  },
};

export default resolvers;
