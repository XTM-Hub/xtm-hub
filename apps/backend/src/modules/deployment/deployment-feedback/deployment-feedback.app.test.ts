import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { HasRepliedSatisfaction } from '../../../__generated__/resolvers-types';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import {
  TelemetryOrganizationType,
  TelemetrySource,
} from '../../telemetry/telemetry.const';
import { TelemetryEventType } from '../../telemetry/telemetry.types';
import { DeploymentFeedbackApp } from './deployment-feedback.app';

const CURRENT_USER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2;
const JUSTIFICATION = 'Deployment took too long';

describe('deploymentFeedbackApp', () => {
  describe('giveDeploymentFeedback', () => {
    beforeEach(() => {
      vi.spyOn(TelemetryApp, 'sendTelemetryEvent').mockResolvedValue();
    });

    afterEach(async () => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      await TestHelper.user.update(
        { id: CURRENT_USER.ID },
        { has_replied_satisfaction: null }
      );
    });

    it('should send a reply satisfaction telemetry event when the user gives a feedback', async () => {
      // Given
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2025, 1, 3, 13, 12, 15)));
      const deploymentRequestId = uuidv4() as DeploymentRequestId;

      // When
      await DeploymentFeedbackApp.giveDeploymentFeedback({
        deploymentRequestId,
        answer: HasRepliedSatisfaction.No,
        justification: JUSTIFICATION,
      });

      // Then
      expect(TelemetryApp.sendTelemetryEvent).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.REPLY_SATISFACTION,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: CURRENT_USER.ID,
        user_email: CURRENT_USER.EMAIL,
        answer: HasRepliedSatisfaction.No,
        justification: JUSTIFICATION,
        deployment_id: deploymentRequestId,
      });
    });

    it.each([HasRepliedSatisfaction.Yes, HasRepliedSatisfaction.No])(
      'should store the %s answer on the current user',
      async (answer) => {
        // Given
        const deploymentRequestId = uuidv4() as DeploymentRequestId;

        // When
        await DeploymentFeedbackApp.giveDeploymentFeedback({
          deploymentRequestId,
          answer,
        });

        // Then
        const user = await TestHelper.user.load({ id: CURRENT_USER.ID });
        expect(user.has_replied_satisfaction).toBe(answer);
      }
    );
  });
});
