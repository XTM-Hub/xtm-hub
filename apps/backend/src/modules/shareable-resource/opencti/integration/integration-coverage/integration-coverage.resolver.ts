import { Resolvers } from '../../../../../__generated__/resolvers-types';
import { UnknownErrorCode } from '../../../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../../../utils/error/error.mapping';
import { IntegrationCoverageApp } from './integration-coverage.app';

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
  },
};

export default resolvers;
