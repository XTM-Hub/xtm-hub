import { Resolvers } from '../../../../../__generated__/resolvers-types';
import { UnknownErrorCode } from '../../../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../../../utils/error/error.mapping';
import { IntegrationCoverageApp } from './integration-coverage.app';
import { KNOWN_OBJECT_TYPES } from './integration-coverage.inference';

const resolvers: Resolvers = {
  Query: {
    integrationsByCoverage: async (_, { input }) => {
      try {
        return await IntegrationCoverageApp.searchIntegrationsByCoverage(input);
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
