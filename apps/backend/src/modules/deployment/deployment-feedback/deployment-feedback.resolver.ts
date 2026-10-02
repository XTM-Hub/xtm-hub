import { Resolvers } from '../../../__generated__/resolvers-types';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { DeploymentFeedbackApp } from './deployment-feedback.app';

const resolvers: Resolvers = {
  Mutation: {
    giveDeploymentFeedback: async (_, { input }) => {
      try {
        return await DeploymentFeedbackApp.giveDeploymentFeedback(input);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeploymentFeedbackUnknownError
        );
      }
    },
  },
};

export default resolvers;
