import {
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformState,
  ServiceInstanceCreationStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import DeploymentRequestModel from '../../model/kanel/public/DeploymentRequest';
import { UserId } from '../../model/kanel/public/User';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode, NotFoundErrorCode } from '../../utils/error/error.code';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryHelper } from '../telemetry/telemetry.helper';
import { DeploymentRequestDomain } from './deployment.domain';
import { DeploymentHelper } from './deployment.helper';
import { DeploymentQuotaApp } from './quota/deployment.quota.app';
import {
  DeploymentQuotaDomain,
  quotaKeysOfRequest,
} from './quota/deployment.quota.domain';

export const BUNDLE_REQUEST_CANCELLATION_REASON =
  'Other: Cancelled automatically when the XTM Platform trial was requested';

export const DeploymentCancellationApp = {
  sendUpdateDeploymentTelemetryEvent: async (
    deploymentRequest: DeploymentRequestModel,
    userId: UserId,
    previousDeploymentRequest?: DeploymentRequestModel
  ) => {
    if (
      previousDeploymentRequest &&
      !DeploymentHelper.hasDeploymentTelemetryDataChanged(
        previousDeploymentRequest,
        deploymentRequest
      )
    ) {
      return;
    }

    try {
      const organization = await OrganizationDomain.loadOrganizationBy({
        id: deploymentRequest.organization_requester_id,
      });
      if (!organization) {
        throw new Error(ErrorCode.OrganizationNotFound);
      }
      const updateDeploymentEvent = TelemetryHelper.buildUpdateDeploymentEvent(
        organization,
        userId,
        {
          status: deploymentRequest.hub_status,
          start_date: deploymentRequest.start_date,
          end_date: deploymentRequest.end_date,
          deployment_id: deploymentRequest.id,
          deployment_type: deploymentRequest.type,
          parent_id: deploymentRequest.parent_id ?? undefined,
          platform_id: deploymentRequest.platform_id,
          cancellation_reason:
            deploymentRequest.hub_status ===
            DeploymentRequestHubStatus.Cancelled
              ? deploymentRequest.cancellation_reason
              : undefined,
        }
      );

      await TelemetryApp.sendTelemetryEvent(updateDeploymentEvent);
    } catch (error) {
      logApp.error(
        `Unable to send telemetry event when updating deployment request with status ${deploymentRequest.hub_status}`,
        {
          error,
        }
      );
    }
  },

  releaseDeploymentRequestPlace: async (
    previousHubStatus: DeploymentRequestHubStatus,
    request: DeploymentRequestModel
  ) => {
    const promotedRequest = await DeploymentQuotaApp.releaseQuotaForRequest(
      request,
      previousHubStatus
    );

    if (promotedRequest) {
      const user = requestContext.requireUser();

      await DeploymentCancellationApp.sendUpdateDeploymentTelemetryEvent(
        promotedRequest,
        user.id
      );
    }
  },

  applyCancellationToDeploymentRequest: async ({
    deploymentRequest,
    userId,
    isAdmin,
    cancellationReason,
  }: {
    deploymentRequest: DeploymentRequestModel;
    userId: UserId;
    isAdmin: boolean;
    cancellationReason?: string;
  }): Promise<DeploymentRequestModel> => {
    const previousHubStatus = deploymentRequest.hub_status;

    const countsInOrgaQuota =
      isAdmin ||
      ![
        DeploymentRequestPlatformState.Unprovisioned,
        DeploymentRequestPlatformState.Provisioning,
      ].includes(
        deploymentRequest.actual_state ??
          DeploymentRequestPlatformState.Unprovisioned
      );

    const target_state =
      deploymentRequest.actual_state ===
      DeploymentRequestPlatformState.Unprovisioned
        ? DeploymentRequestPlatformState.Unprovisioned
        : DeploymentRequestPlatformState.Removed;

    return DeploymentQuotaDomain.withLockedQuotaTransaction(
      quotaKeysOfRequest(deploymentRequest),
      async () => {
        const updatedDeploymentRequest =
          await DeploymentRequestDomain.updateDeploymentRequestById(
            deploymentRequest.id,
            {
              hub_status: DeploymentRequestHubStatus.Cancelled,
              target_state: target_state,
              cancellation_date: new Date(),
              cancellation_user_id: userId,
              cancellation_reason: cancellationReason,
              counts_in_orga_quota: countsInOrgaQuota,
            }
          );
        if (!updatedDeploymentRequest) {
          throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
        }
        if (!countsInOrgaQuota) {
          await ServiceInstanceDomain.updateServiceInstance(
            deploymentRequest.service_instance_id,
            {
              creation_status: ServiceInstanceCreationStatus.Disabled,
            }
          );
        }
        await DeploymentCancellationApp.releaseDeploymentRequestPlace(
          previousHubStatus,
          deploymentRequest
        );

        return updatedDeploymentRequest;
      }
    );
  },

  cancelOngoingStandaloneTrialsForBundle: async (
    bundle: DeploymentRequestModel
  ): Promise<void> => {
    const standaloneTrials =
      await DeploymentRequestDomain.loadOngoingStandaloneTrialsForOrganization(
        bundle.organization_requester_id
      );

    for (const trial of standaloneTrials) {
      await DeploymentCancellationApp.applyCancellationToDeploymentRequest({
        deploymentRequest: trial,
        userId: bundle.user_requester_id,
        isAdmin: false,
        cancellationReason: BUNDLE_REQUEST_CANCELLATION_REASON,
      });
    }
  },
};
