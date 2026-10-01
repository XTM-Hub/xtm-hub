import {
  GiveDeploymentFeedbackInput,
  Success,
} from '../../../__generated__/resolvers-types';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../telemetry/telemetry.helper';
import { DeploymentFeedbackDomain } from './deployment-feedback.domain';

export const DeploymentFeedbackApp = {
  giveDeploymentFeedback: async (
    input: GiveDeploymentFeedbackInput
  ): Promise<Success> => {
    await DeploymentFeedbackDomain.giveDeploymentFeedback(input.answer);
    const replySatisfactionEvent = await TelemetryHelper.buildSatisfactionEvent(
      input.answer,
      input.deploymentRequestId,
      input.justification
    );
    await TelemetryApp.sendTelemetryEvent(replySatisfactionEvent);

    return { success: true };
  },
};
