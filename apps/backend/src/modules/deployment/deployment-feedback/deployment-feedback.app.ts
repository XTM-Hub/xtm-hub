import {
  GiveDeploymentFeedbackInput,
  Success,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import {
  AlreadyExistsErrorCode,
  ErrorCode,
} from '../../../utils/error/error.code';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../telemetry/telemetry.helper';
import { DeploymentRequestDomain } from '../deployment.domain';
import { DeploymentFeedbackDomain } from './deployment-feedback.domain';

export const DeploymentFeedbackApp = {
  giveDeploymentFeedback: async (
    input: GiveDeploymentFeedbackInput
  ): Promise<Success> => {
    const user = requestContext.requireUser();
    if (user.has_replied_satisfaction) {
      throw new Error(AlreadyExistsErrorCode.DeploymentFeedbackAlreadyExists);
    }
    const deploymentRequest =
      await DeploymentRequestDomain.loadDeploymentRequestBy({
        id: input.deploymentRequestId,
      });
    if (
      deploymentRequest?.organization_requester_id !==
      user.selected_organization_id
    ) {
      throw new Error(ErrorCode.UserIsNotInOrganization);
    }
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
