import {
  CreateDeploymentRequestInput,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformState,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import DeploymentRequestModel from '../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../model/kanel/public/Organization';
import {
  AlreadyExistsErrorCode,
  BadRequestErrorCode,
} from '../../utils/error/error.code';
import { DeploymentRequestDomain } from './deployment.domain';

export type ValidatedDeploymentRequestProducts =
  | {
      type: DeploymentRequestDeploymentType.Bundle;
      products: PlatformIdentifier[];
    }
  | {
      type: DeploymentRequestDeploymentType.Trial;
      platformIdentifier: PlatformIdentifier;
    };

type HubStatusTransition = {
  from: DeploymentRequestHubStatus;
  to: DeploymentRequestHubStatus;
};

type PlatformStateTransition = {
  from: DeploymentRequestPlatformState;
  to: DeploymentRequestPlatformState;
  requiredTargetState?: DeploymentRequestPlatformState;
};

const VALID_HUB_STATUS_TRANSITIONS: HubStatusTransition[] = [
  {
    from: DeploymentRequestHubStatus.Queued,
    to: DeploymentRequestHubStatus.Pending,
  },
  {
    from: DeploymentRequestHubStatus.Queued,
    to: DeploymentRequestHubStatus.Cancelled,
  },
  {
    from: DeploymentRequestHubStatus.Pending,
    to: DeploymentRequestHubStatus.Active,
  },
  {
    from: DeploymentRequestHubStatus.Pending,
    to: DeploymentRequestHubStatus.Failed,
  },
  {
    from: DeploymentRequestHubStatus.Pending,
    to: DeploymentRequestHubStatus.Cancelled,
  },
  {
    from: DeploymentRequestHubStatus.Pending,
    to: DeploymentRequestHubStatus.Provisioning,
  },
  {
    from: DeploymentRequestHubStatus.Provisioning,
    to: DeploymentRequestHubStatus.Active,
  },
  {
    from: DeploymentRequestHubStatus.Provisioning,
    to: DeploymentRequestHubStatus.Cancelled,
  },
  {
    from: DeploymentRequestHubStatus.Active,
    to: DeploymentRequestHubStatus.Expired,
  },
  {
    from: DeploymentRequestHubStatus.Active,
    to: DeploymentRequestHubStatus.Cancelled,
  },
  {
    from: DeploymentRequestHubStatus.Failed,
    to: DeploymentRequestHubStatus.Pending,
  },
  {
    from: DeploymentRequestHubStatus.Failed,
    to: DeploymentRequestHubStatus.Provisioning,
  },
  {
    from: DeploymentRequestHubStatus.Failed,
    to: DeploymentRequestHubStatus.Active,
  },
];

const VALID_PLATFORM_STATE_TRANSITIONS: PlatformStateTransition[] = [
  {
    from: DeploymentRequestPlatformState.Unprovisioned,
    to: DeploymentRequestPlatformState.Provisioning,
  },
  {
    from: DeploymentRequestPlatformState.Unprovisioned,
    to: DeploymentRequestPlatformState.Active,
  },
  {
    from: DeploymentRequestPlatformState.Provisioning,
    to: DeploymentRequestPlatformState.Active,
  },
  {
    from: DeploymentRequestPlatformState.Provisioning,
    to: DeploymentRequestPlatformState.Removing,
  },
  {
    from: DeploymentRequestPlatformState.Provisioning,
    to: DeploymentRequestPlatformState.Removed,
  },
  {
    from: DeploymentRequestPlatformState.Active,
    to: DeploymentRequestPlatformState.Removing,
  },
  {
    from: DeploymentRequestPlatformState.Active,
    to: DeploymentRequestPlatformState.Removed,
  },
  {
    from: DeploymentRequestPlatformState.Removing,
    to: DeploymentRequestPlatformState.Removed,
  },
  // The platform can remove an instance before redeploying it. Removal may complete
  // between two status polls, so the `removed` state is not always observed.
  {
    from: DeploymentRequestPlatformState.Removing,
    to: DeploymentRequestPlatformState.Provisioning,
    requiredTargetState: DeploymentRequestPlatformState.Active,
  },
  {
    from: DeploymentRequestPlatformState.Removed,
    to: DeploymentRequestPlatformState.Provisioning,
    requiredTargetState: DeploymentRequestPlatformState.Active,
  },
];

export const DeploymentHelper = {
  isHubStatusTransitionValid: (
    from: DeploymentRequestHubStatus,
    to: DeploymentRequestHubStatus
  ): boolean => {
    return (
      from === to ||
      VALID_HUB_STATUS_TRANSITIONS.some((t) => t.from === from && t.to === to)
    );
  },

  isPlatformStateTransitionValid: (
    from: DeploymentRequestPlatformState | null,
    to: DeploymentRequestPlatformState | null,
    targetState?: DeploymentRequestPlatformState | null
  ): boolean => {
    return (
      from === to ||
      VALID_PLATFORM_STATE_TRANSITIONS.some(
        (t) =>
          t.from === from &&
          t.to === to &&
          (!t.requiredTargetState || t.requiredTargetState === targetState)
      )
    );
  },

  assertFreeTrialsLimit: async (
    organizationId: OrganizationId,
    validatedProducts: ValidatedDeploymentRequestProducts
  ) => {
    if (validatedProducts.type === DeploymentRequestDeploymentType.Bundle) {
      const existingBundle =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          organization_requester_id: organizationId,
          type: DeploymentRequestDeploymentType.Bundle,
          counts_in_orga_quota: true,
        });
      if (existingBundle) {
        throw new Error(AlreadyExistsErrorCode.FreeTrialAlreadyExists);
      }

      return;
    }

    const freeTrialsRequests =
      await DeploymentRequestDomain.loadDeploymentRequestBy({
        organization_requester_id: organizationId,
        type: DeploymentRequestDeploymentType.Trial,
        counts_in_orga_quota: true,
        platform_identifier: validatedProducts.platformIdentifier,
      });
    if (freeTrialsRequests) {
      throw new Error(AlreadyExistsErrorCode.FreeTrialAlreadyExists);
    }
  },

  hasDeploymentTelemetryDataChanged: (
    previous: DeploymentRequestModel,
    current: DeploymentRequestModel
  ): boolean => {
    return (
      previous.hub_status !== current.hub_status ||
      previous.platform_id !== current.platform_id ||
      previous.cancellation_reason !== current.cancellation_reason ||
      previous.start_date?.getTime() !== current.start_date?.getTime() ||
      previous.end_date?.getTime() !== current.end_date?.getTime()
    );
  },

  computeBundleDates: (
    children: DeploymentRequestModel[]
  ): { start_date: Date | null; end_date: Date | null } => {
    const startTimes = children.flatMap((child) =>
      child.start_date ? [child.start_date.getTime()] : []
    );
    const endTimes = children.flatMap((child) =>
      child.end_date ? [child.end_date.getTime()] : []
    );

    return {
      start_date:
        startTimes.length === 0 ? null : new Date(Math.min(...startTimes)),
      end_date: endTimes.length === 0 ? null : new Date(Math.max(...endTimes)),
    };
  },

  computeHubStatus: (
    currentHubStatus: DeploymentRequestHubStatus,
    actualState: DeploymentRequestPlatformState | null | undefined
  ) => {
    if (!actualState) {
      return currentHubStatus;
    }

    if (
      currentHubStatus === DeploymentRequestHubStatus.Queued ||
      actualState === DeploymentRequestPlatformState.Unprovisioned
    ) {
      return null;
    }

    let newHubStatus = currentHubStatus;

    switch (actualState) {
      case DeploymentRequestPlatformState.Active:
        newHubStatus = DeploymentRequestHubStatus.Active;
        break;
      case DeploymentRequestPlatformState.Provisioning:
        newHubStatus = DeploymentRequestHubStatus.Provisioning;
        break;
      case DeploymentRequestPlatformState.Removing:
      case DeploymentRequestPlatformState.Removed:
        if (
          currentHubStatus !== DeploymentRequestHubStatus.Expired &&
          currentHubStatus !== DeploymentRequestHubStatus.Cancelled
        ) {
          return null;
        }
        newHubStatus = currentHubStatus;
        break;
    }

    if (
      !DeploymentHelper.isHubStatusTransitionValid(
        currentHubStatus,
        newHubStatus
      )
    ) {
      return null;
    }

    return newHubStatus;
  },

  validateUseCasesByProduct: (
    input: CreateDeploymentRequestInput,
    uniqueProducts: PlatformIdentifier[]
  ): void => {
    const productsRequiringUseCase = uniqueProducts.filter(
      (platformIdentifier) => platformIdentifier !== PlatformIdentifier.Xtmone
    );
    const everyProductHasUseCase = productsRequiringUseCase.every(
      (platformIdentifier) =>
        input.use_cases_by_product?.some(
          (entry) => entry.platform_identifier === platformIdentifier
        )
    );
    const everyEntryTargetsAValidProduct =
      input.use_cases_by_product?.every(
        (entry) =>
          entry.platform_identifier !== PlatformIdentifier.Xtmone &&
          uniqueProducts.includes(entry.platform_identifier)
      ) ?? true;
    const targetedProducts =
      input.use_cases_by_product?.map((entry) => entry.platform_identifier) ??
      [];
    const hasDuplicatedEntry =
      targetedProducts.length !== new Set(targetedProducts).size;

    const areUseCasesForProductsInvalid =
      !everyEntryTargetsAValidProduct ||
      !everyProductHasUseCase ||
      hasDuplicatedEntry;
    if (areUseCasesForProductsInvalid) {
      throw new Error(BadRequestErrorCode.InvalidUseCasesForProducts);
    }
  },
};
