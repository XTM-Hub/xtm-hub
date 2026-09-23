import { Resolvers } from '../../__generated__/resolvers-types';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { ContentTranslationApp } from './content-translation.app';

const resolvers: Resolvers = {
  Query: {
    contentTranslations: (_, args) =>
      ContentTranslationApp.loadContentTranslationsBy(args),
  },
  Mutation: {
    upsertContentTranslation: async (_, args) => {
      try {
        return await ContentTranslationApp.upsertContentTranslationBy(args);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default resolvers;
