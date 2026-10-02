import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../tests/tests.const';
import {
  GiveDeploymentFeedbackInput,
  HasRepliedSatisfaction,
} from '../../../__generated__/resolvers-types';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import { ErrorType } from '../../../utils/error/error.type';
import { DeploymentFeedbackApp } from './deployment-feedback.app';
import deploymentFeedbackResolver from './deployment-feedback.resolver';

describe('give deployment feedback GraphQL mutation', () => {
  it('should delegate to DeploymentFeedbackApp.giveDeploymentFeedback and return success', async () => {
    // Given
    const input: GiveDeploymentFeedbackInput = {
      deploymentRequestId: uuidv4() as DeploymentRequestId,
      answer: HasRepliedSatisfaction.No,
      justification: 'Deployment took too long',
    };
    vi.spyOn(DeploymentFeedbackApp, 'giveDeploymentFeedback').mockResolvedValue(
      { success: true }
    );

    // When
    const result = await deploymentFeedbackResolver.Mutation!
      .giveDeploymentFeedback!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(DeploymentFeedbackApp.giveDeploymentFeedback).toHaveBeenCalledWith(
      input
    );
    expect(result).toEqual({ success: true });
  });

  it('should throw mapped error when DeploymentFeedbackApp throws', async () => {
    // Given
    const input: GiveDeploymentFeedbackInput = {
      deploymentRequestId: uuidv4() as DeploymentRequestId,
      answer: HasRepliedSatisfaction.Yes,
    };
    vi.spyOn(DeploymentFeedbackApp, 'giveDeploymentFeedback').mockRejectedValue(
      new Error('UNEXPECTED')
    );

    // When
    const call = deploymentFeedbackResolver.Mutation!.giveDeploymentFeedback!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.UnknownError });
  });
});
