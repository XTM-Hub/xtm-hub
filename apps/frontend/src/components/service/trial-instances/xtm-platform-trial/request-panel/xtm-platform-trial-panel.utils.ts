import {
  DeploymentRequestHubStatus,
  PlatformIdentifier,
} from '@graphql/generated';

export enum XtmPlatformTrialStatusPanelState {
  RequestInProgress = 'request-in-progress',
  Cancelled = 'cancelled',
  Expired = 'expired',
  Failed = 'failed',
}

/**
 * View model for the private XTM Platform trial page: a discriminated union
 * carrying exactly the data each panel needs, so consumers can switch on
 * `kind` instead of re-deriving booleans from a flat state enum.
 */
export type XtmPlatformTrialPanelView =
  | { kind: 'personalSpace' }
  | { kind: 'notAllowed' }
  | { kind: 'form'; hasOngoingStandaloneTrials: boolean }
  | {
      kind: 'status';
      state: XtmPlatformTrialStatusPanelState;
      stepIndex: number | undefined;
    };

interface DeriveXtmPlatformTrialPanelViewParams {
  isPersonalSpace: boolean;
  isAllowed: boolean;
  ongoingStandaloneTrials: PlatformIdentifier[];
  hubStatus?: DeploymentRequestHubStatus | null;
}

const HUB_STATUS_PANEL_STATE: Record<
  DeploymentRequestHubStatus,
  XtmPlatformTrialStatusPanelState | null
> = {
  [DeploymentRequestHubStatus.Queued]:
    XtmPlatformTrialStatusPanelState.RequestInProgress,
  [DeploymentRequestHubStatus.Pending]:
    XtmPlatformTrialStatusPanelState.RequestInProgress,
  [DeploymentRequestHubStatus.Provisioning]:
    XtmPlatformTrialStatusPanelState.RequestInProgress,
  [DeploymentRequestHubStatus.Active]: null,
  [DeploymentRequestHubStatus.Cancelled]:
    XtmPlatformTrialStatusPanelState.Cancelled,
  [DeploymentRequestHubStatus.Expired]:
    XtmPlatformTrialStatusPanelState.Expired,
  [DeploymentRequestHubStatus.Failed]: XtmPlatformTrialStatusPanelState.Failed,
};

const getRequestInProgressStepIndex = (
  hubStatus: DeploymentRequestHubStatus
): number => {
  switch (hubStatus) {
    case DeploymentRequestHubStatus.Queued:
    case DeploymentRequestHubStatus.Pending:
      return 0;
    case DeploymentRequestHubStatus.Provisioning:
      return 1;
    default:
      return 2;
  }
};

/**
 * Derives which panel view to render on the private XTM Platform trial page.
 * The public page always shows the sign-in panel and does not use this.
 */
export const deriveXtmPlatformTrialPanelView = ({
  isPersonalSpace,
  isAllowed,
  ongoingStandaloneTrials,
  hubStatus,
}: DeriveXtmPlatformTrialPanelViewParams): XtmPlatformTrialPanelView => {
  if (isPersonalSpace) {
    return { kind: 'personalSpace' };
  }
  if (!isAllowed) {
    return { kind: 'notAllowed' };
  }
  if (hubStatus) {
    const statusPanelState = HUB_STATUS_PANEL_STATE[hubStatus];
    if (statusPanelState) {
      return {
        kind: 'status',
        state: statusPanelState,
        stepIndex:
          statusPanelState ===
          XtmPlatformTrialStatusPanelState.RequestInProgress
            ? getRequestInProgressStepIndex(hubStatus)
            : undefined,
      };
    }
  }
  return {
    kind: 'form',
    hasOngoingStandaloneTrials: ongoingStandaloneTrials.length > 0,
  };
};
