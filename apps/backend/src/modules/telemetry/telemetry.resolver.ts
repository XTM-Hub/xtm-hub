import { Resolvers } from '../../__generated__/resolvers-types';
import { UserId } from '../../model/kanel/public/User';
import { logApp } from '../../utils/app-logger.util';
import { getErrorMessage } from '../../utils/error/error-guard.util';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { TelemetryApp } from './telemetry.app';

const runTelemetryMutation = async (
  send: () => Promise<void>
): Promise<{ result: boolean; message?: string }> => {
  try {
    await send();
    return { result: true };
  } catch (error) {
    logApp.error('Error in sendTelemetryEvent resolver', {
      error,
    });
    const errorMessage = getErrorMessage(error);
    const isGenericErrorMessage =
      !errorMessage || errorMessage === UnknownErrorCode.UnknownError;
    const message = !isGenericErrorMessage
      ? errorMessage
      : 'An error occurred while processing sendTelemetryEvent';

    return {
      result: false,
      message,
    };
  }
};

const resolvers: Resolvers = {
  Mutation: {
    sendTelemetryEvent: () => {
      return {}; // just a placeholder object is fine
    },
  },

  SendTelemetryMutation: {
    oneClickDeploy: async (_, args, context) => {
      const { input } = args;
      return runTelemetryMutation(() =>
        TelemetryApp.sendOneClickDeployEvent({
          userId: context.user.id as UserId,
          input,
        })
      );
    },

    newsFeedRedirect: async (_, args, context) => {
      const { input } = args;
      return runTelemetryMutation(() =>
        TelemetryApp.sendResourceNewsFeedRedirectEvent({
          user: context.user,
          input,
        })
      );
    },
  },
};

export default resolvers;
