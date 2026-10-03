import { Resolvers } from '../../../../../__generated__/resolvers-types';
import { UnknownErrorCode } from '../../../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../../../utils/error/error.mapping';
import { isFieldSelected } from '../../../../../utils/graphql-selection.util';
import { IntegrationCoverageApp } from './integration-coverage.app';
import { KNOWN_OBJECT_TYPES } from './integration-coverage.inference';

const resolvers: Resolvers = {
  Query: {
    integrationsByCoverage: async (_, { input }, _context, info) => {
      try {
        // The facets cost seven aggregations: they are computed only when the query selects them
        return await IntegrationCoverageApp.searchIntegrationsByCoverage(
          input,
          {
            withFacets: isFieldSelected(info, 'facets'),
          }
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
