import { DeploymentRequestHubStatus } from '@graphql/generated';

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
  | { kind: 'form' }
  | {
      kind: 'status';
      state: XtmPlatformTrialStatusPanelState;
      stepIndex: number | undefined;
    };

interface DeriveXtmPlatformTrialPanelViewParams {
  isPersonalSpace: boolean;
  isAllowed: boolean;
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
  return { kind: 'form' };
};

export interface XtmPlatformTrialRequestPageLayout {
  showLimitations: boolean;
  showExpiredTitle: boolean;
}

/**
 * Derives what the request page shows around the panel: the limitations only
 * while the trial can still be requested or is on its way, and the expired
 * title once the trial has expired.
 */
export const deriveXtmPlatformTrialRequestPageLayout = (
  view: XtmPlatformTrialPanelView
): XtmPlatformTrialRequestPageLayout => {
  const statusPanelState = view.kind === 'status' ? view.state : undefined;
  return {
    showLimitations:
      view.kind === 'form' ||
      statusPanelState === XtmPlatformTrialStatusPanelState.RequestInProgress,
    showExpiredTitle:
      statusPanelState === XtmPlatformTrialStatusPanelState.Expired,
  };
};
