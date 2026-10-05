import { Resolvers } from '../../__generated__/resolvers-types';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { ContentTranslationApp } from './content-translation.app';

const resolvers: Resolvers = {
  Query: {
    contentTranslations: (_, args) =>
      ContentTranslationApp.loadContentTranslationsBy(args),
    contentTranslationDrafts: (_, args) =>
      ContentTranslationApp.loadContentTranslationDraftsBy(args),
  },
  Mutation: {
    saveContentTranslationDraft: async (_, args) => {
      try {
        return await ContentTranslationApp.saveContentTranslationDraftBy(args);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    publishContentTranslationDrafts: async () => {
      try {
        return await ContentTranslationApp.publishContentTranslationDrafts();
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    discardContentTranslationDrafts: async () => {
      try {
        return await ContentTranslationApp.discardContentTranslationDrafts();
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default resolvers;
