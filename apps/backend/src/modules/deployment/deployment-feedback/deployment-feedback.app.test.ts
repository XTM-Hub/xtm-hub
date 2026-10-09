import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextSimpleUserFiligran2,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { HasRepliedSatisfaction } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { UserId } from '../../../model/kanel/public/User';
import * as pub from '../../../pub';
import * as sessionStoreManager from '../../../session-store-manager';
import {
  AlreadyExistsErrorCode,
  ErrorCode,
} from '../../../utils/error/error.code';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import {
  TelemetryOrganizationType,
  TelemetrySource,
} from '../../telemetry/telemetry.const';
import { TelemetryEventType } from '../../telemetry/telemetry.types';
import { DeploymentFeedbackApp } from './deployment-feedback.app';

const CURRENT_USER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2;
const JUSTIFICATION = 'Deployment took too long';
const DEPLOYMENT_REQUEST_ID = uuidv4() as DeploymentRequestId;

const createDeploymentRequest = (
  organizationRequesterId: OrganizationId,
  userRequesterId: UserId
) =>
  TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription({
    id: DEPLOYMENT_REQUEST_ID,
    organization_requester_id: organizationRequesterId,
    user_requester_id: userRequesterId,
  });

describe('deploymentFeedbackApp', () => {
  describe('giveDeploymentFeedback', () => {
    beforeEach(() => {
      vi.spyOn(TelemetryApp, 'sendTelemetryEvent').mockResolvedValue();
      vi.spyOn(sessionStoreManager, 'updateUserSession').mockResolvedValue();
      vi.spyOn(pub, 'dispatch').mockResolvedValue();
    });

    afterEach(async () => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      await TestHelper.deploymentRequest.deleteBundle(DEPLOYMENT_REQUEST_ID);
      await TestHelper.user.update(
        { id: CURRENT_USER.ID },
        { has_replied_satisfaction: null }
      );
    });

    it('should send a reply satisfaction telemetry event when the user gives a feedback', async () => {
      // Given
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2025, 1, 3, 13, 12, 15)));
      await createDeploymentRequest(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        CURRENT_USER.ID
      );

      // When
      await DeploymentFeedbackApp.giveDeploymentFeedback({
        deploymentRequestId: DEPLOYMENT_REQUEST_ID,
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
        email: CURRENT_USER.EMAIL,
        answer: HasRepliedSatisfaction.No,
        justification: JUSTIFICATION,
        deployment_id: DEPLOYMENT_REQUEST_ID,
      });
    });

    it.each([HasRepliedSatisfaction.Yes, HasRepliedSatisfaction.No])(
      'should store the %s answer on the current user',
      async (answer) => {
        // Given
        await createDeploymentRequest(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          CURRENT_USER.ID
        );

        // When
        await DeploymentFeedbackApp.giveDeploymentFeedback({
          deploymentRequestId: DEPLOYMENT_REQUEST_ID,
          answer,
        });

        // Then
        const user = await TestHelper.user.load({ id: CURRENT_USER.ID });
        expect(user.has_replied_satisfaction).toBe(answer);
      }
    );

    it.each([HasRepliedSatisfaction.Yes, HasRepliedSatisfaction.No])(
      'should refresh the user session and dispatch the user with the %s answer',
      async (answer) => {
        // Given
        await createDeploymentRequest(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          CURRENT_USER.ID
        );

        // When
        await DeploymentFeedbackApp.giveDeploymentFeedback({
          deploymentRequestId: DEPLOYMENT_REQUEST_ID,
          answer,
        });

        // Then
        expect(sessionStoreManager.updateUserSession).toHaveBeenCalledOnce();
        expect(
          vi.mocked(sessionStoreManager.updateUserSession).mock.calls[0]![0]
        ).toMatchObject({
          id: CURRENT_USER.ID,
          email: CURRENT_USER.EMAIL,
          selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          has_replied_satisfaction: answer,
        });
        expect(pub.dispatch).toHaveBeenCalledExactlyOnceWith(
          'User',
          'edit',
          expect.objectContaining({
            id: CURRENT_USER.ID,
            has_replied_satisfaction: answer,
          })
        );
      }
    );

    it.each([
      HasRepliedSatisfaction.Yes,
      HasRepliedSatisfaction.No,
      HasRepliedSatisfaction.Closed,
    ])(
      'should throw DeploymentFeedbackAlreadyExists when the database holds a %s answer but the session user does not',
      async (storedAnswer) => {
        // Given
        await createDeploymentRequest(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          CURRENT_USER.ID
        );
        await TestHelper.user.update(
          { id: CURRENT_USER.ID },
          { has_replied_satisfaction: storedAnswer }
        );
        requestContext.update({
          user: {
            ...contextSimpleUserFiligran2.user,
            has_replied_satisfaction: null,
          },
        });

        // When
        const call = DeploymentFeedbackApp.giveDeploymentFeedback({
          deploymentRequestId: DEPLOYMENT_REQUEST_ID,
          answer: HasRepliedSatisfaction.Yes,
          justification: JUSTIFICATION,
        });

        // Then
        await expect(call).rejects.toThrow(
          AlreadyExistsErrorCode.DeploymentFeedbackAlreadyExists
        );
        const user = await TestHelper.user.load({ id: CURRENT_USER.ID });
        expect(user).toMatchObject({ has_replied_satisfaction: storedAnswer });
        expect(TelemetryApp.sendTelemetryEvent).not.toHaveBeenCalled();
        expect(
          vi.mocked(sessionStoreManager.updateUserSession).mock.calls[0]![0]
        ).toMatchObject({
          id: CURRENT_USER.ID,
          has_replied_satisfaction: storedAnswer,
        });
      }
    );

    it.each([
      HasRepliedSatisfaction.Yes,
      HasRepliedSatisfaction.No,
      HasRepliedSatisfaction.Closed,
    ])(
      'should throw DeploymentFeedbackAlreadyExists when the user has already replied %s',
      async (previousAnswer) => {
        // Given
        await createDeploymentRequest(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          CURRENT_USER.ID
        );
        requestContext.update({
          user: {
            ...contextSimpleUserFiligran2.user,
            has_replied_satisfaction: previousAnswer,
          },
        });

        // When
        const call = DeploymentFeedbackApp.giveDeploymentFeedback({
          deploymentRequestId: DEPLOYMENT_REQUEST_ID,
          answer: HasRepliedSatisfaction.Yes,
        });

        // Then
        await expect(call).rejects.toThrow(
          AlreadyExistsErrorCode.DeploymentFeedbackAlreadyExists
        );
      }
    );

    it('should throw UserIsNotInOrganization when the deployment request belongs to another organization', async () => {
      // Given
      await createDeploymentRequest(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID
      );

      // When
      const call = DeploymentFeedbackApp.giveDeploymentFeedback({
        deploymentRequestId: DEPLOYMENT_REQUEST_ID,
        answer: HasRepliedSatisfaction.Yes,
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should throw UserIsNotInOrganization when the deployment request does not exist', async () => {
      // Given
      const unknownDeploymentRequestId = uuidv4() as DeploymentRequestId;

      // When
      const call = DeploymentFeedbackApp.giveDeploymentFeedback({
        deploymentRequestId: unknownDeploymentRequestId,
        answer: HasRepliedSatisfaction.Yes,
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });
  });
});
