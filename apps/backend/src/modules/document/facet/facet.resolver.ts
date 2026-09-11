import { Resolvers } from '../../../__generated__/resolvers-types';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { FacetApp } from './facet.app';

const resolvers: Resolvers = {
  Query: {
    documentFacets: async (_, { input }) => {
      try {
        return await FacetApp.loadDocumentFacets(input);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.ListFacetError);
      }
    },
  },
  Mutation: {},
};

export default resolvers;
