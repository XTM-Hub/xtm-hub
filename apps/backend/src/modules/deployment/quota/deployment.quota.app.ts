import {
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
} from '../../../__generated__/resolvers-types';
import DeploymentRequestModel from '../../../model/kanel/public/DeploymentRequest';
import { DeploymentRequestDomain, isBundleChild } from '../deployment.domain';
import {
  bundleQuotaKey,
  DeploymentQuotaDomain,
  QuotaKey,
} from './deployment.quota.domain';

const QUOTA_HOLDING_HUB_STATUSES = [
  DeploymentRequestHubStatus.Active,
  DeploymentRequestHubStatus.Pending,
  DeploymentRequestHubStatus.Provisioning,
];

const demoteLastPendingRequest = async (
  key: QuotaKey
): Promise<DeploymentRequestModel | undefined> => {
  const request = await DeploymentRequestDomain.loadLastPendingRequest(key);
  if (!request) {
    return undefined;
  }

  const family =
    await DeploymentRequestDomain.loadDeploymentRequestWithChildren(
      request,
      DeploymentRequestHubStatus.Pending
    );

  const demotedRequest =
    await DeploymentRequestDomain.setRequestAsQueued(request);

  for (const familyMember of family) {
    await DeploymentQuotaApp.releaseQuotaForRequest(
      familyMember,
      DeploymentRequestHubStatus.Pending,
      { promote: false }
    );
  }

  return demotedRequest;
};

const promoteNextQueuedRequest = async (
  key: QuotaKey
): Promise<DeploymentRequestModel | undefined> => {
  const candidate = await DeploymentRequestDomain.loadFirstQueuedRequest(key);
  if (!candidate) {
    return undefined;
  }

  const { isPlaceAvailable } = await DeploymentQuotaApp.takeQuotaForRequest({
    region: candidate.region,
  });
  if (!isPlaceAvailable) {
    return undefined;
  }

  return DeploymentRequestDomain.setRequestAsPending(candidate);
};

export const DeploymentQuotaApp = {
  takeQuotaForRequest: async ({
    region,
  }: {
    region: DeploymentRequestPlatformRegion;
  }): Promise<{ isPlaceAvailable: boolean }> => {
    return DeploymentQuotaDomain.reservePlace(bundleQuotaKey(region));
  },

  releaseQuotaForRequest: async (
    request: DeploymentRequestModel,
    previousHubStatus: DeploymentRequestHubStatus,
    { promote = true }: { promote?: boolean } = {}
  ): Promise<DeploymentRequestModel | undefined> => {
    if (!QUOTA_HOLDING_HUB_STATUSES.includes(previousHubStatus)) {
      return undefined;
    }

    if (isBundleChild(request)) {
      return undefined;
    }

    const key = bundleQuotaKey(request.region);
    await DeploymentQuotaDomain.freePlace(key);

    return promote ? promoteNextQueuedRequest(key) : undefined;
  },

  applyQuotaCapacityChange: async ({
    region,
    newCapacity,
    onRequestMoved,
  }: {
    region: DeploymentRequestPlatformRegion;
    newCapacity: number;
    onRequestMoved: (request: DeploymentRequestModel) => Promise<void>;
  }): Promise<void> => {
    const key = bundleQuotaKey(region);

    await DeploymentQuotaDomain.withLockedQuotaTransaction([key], async () => {
      const { newAvailability } =
        await DeploymentQuotaDomain.updateQuotaCapacity({
          key,
          newCapacity,
        });

      for (let i = 0; i < -newAvailability; i++) {
        const demotedRequest = await demoteLastPendingRequest(key);
        if (!demotedRequest) {
          break;
        }

        await onRequestMoved(demotedRequest);
      }

      for (let i = 0; i < newAvailability; i++) {
        const promotedRequest = await promoteNextQueuedRequest(key);
        if (!promotedRequest) {
          break;
        }

        await onRequestMoved(promotedRequest);
      }
    });
  },
};
