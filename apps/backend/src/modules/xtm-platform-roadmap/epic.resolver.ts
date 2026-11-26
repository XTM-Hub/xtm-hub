import { Resolvers } from '../../__generated__/resolvers-types';
import { EpicId } from '../../model/kanel/public/Epic';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { EpicApp } from './epic.app';

const resolvers: Resolvers = {
  Query: {
    epics: async (_parent, opts, _context) => {
      return EpicApp.loadEpics(opts);
    },
    countEpicsPerTimeline: async () => {
      return EpicApp.countEpicsPerTimeline();
    },
  },
  Mutation: {
    createEpic: async (_, { input }) => {
      try {
        return await EpicApp.createEpic(input);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EpicCreateError);
      }
    },
    updateEpic: async (_, { id, input }) => {
      try {
        return await EpicApp.updateEpic(id as EpicId, input);
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
