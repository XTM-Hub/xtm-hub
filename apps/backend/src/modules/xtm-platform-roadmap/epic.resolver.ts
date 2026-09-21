import { Resolvers } from '../../__generated__/resolvers-types';
import Epic, { EpicId } from '../../model/kanel/public/Epic';
import { PortalContext } from '../../model/portal-context';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { EpicApp } from './epic.app';

const resolvers: Resolvers = {
  Epic: {
    document: async (epic, _args, context: PortalContext) => {
      const { document_id } = epic as Epic;
      if (!document_id) return null;
      const document =
        await context.dataLoaders.document.documentByIdLoader.load(document_id);
      return document ?? null;
    },
  },
  Query: {
    epics: async (_parent, opts, _context) => {
      return EpicApp.loadEpics(opts);
    },
    countEpicsPerTimeline: async () => {
      return EpicApp.countEpicsPerTimeline();
    },
  },
  Mutation: {
    createEpic: async (_, { input, document }) => {
      try {
        return await EpicApp.createEpic(input, document ?? []);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EpicCreateError);
      }
    },
    updateEpic: async (_, { id, input, document }) => {
      try {
        return await EpicApp.updateEpic(id as EpicId, input, document ?? []);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EpicUpdateError);
      }
    },
    deleteEpic: async (_, { id }) => {
      try {
        return (await EpicApp.deleteEpic(id as EpicId)) ?? null;
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EpicDeleteError);
      }
    },
  },
};
export default resolvers;
