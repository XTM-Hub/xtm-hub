import { DeploymentRequestHubStatus } from '@graphql/generated';

export type XtmPlatformTrialBannerState =
  'none' | 'no-trial' | 'active' | 'ending';

export interface XtmPlatformTrialBannerDerivedState {
  state: XtmPlatformTrialBannerState;
  daysLeft: number | null;
}

interface DeriveXtmPlatformTrialStateParams {
  isBlacklisted: boolean;
  hubStatus: DeploymentRequestHubStatus | null | undefined;
  endDate: string | null | undefined;
  now?: Date;
}

const ENDING_SOON_THRESHOLD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const computeDaysLeft = (endDate: string, now: Date): number =>
  Math.ceil((new Date(endDate).getTime() - now.getTime()) / MS_PER_DAY);

/**
 * Derives the XTM Platform trial banner state from the raw
 * `platformTrialStatus` query result. `daysLeft` is computed client-side
 * (ceil of the day difference between `endDate` and `now`), since the
 * backend only exposes the raw `end_date`/`hub_status`.
 */
export const deriveXtmPlatformTrialState = ({
  isBlacklisted,
  hubStatus,
  endDate,
  now = new Date(),
}: DeriveXtmPlatformTrialStateParams): XtmPlatformTrialBannerDerivedState => {
  if (isBlacklisted) {
    return { state: 'none', daysLeft: null };
  }

  if (
    hubStatus === DeploymentRequestHubStatus.Expired ||
    hubStatus === DeploymentRequestHubStatus.Cancelled
  ) {
    return { state: 'none', daysLeft: null };
  }

  if (hubStatus !== DeploymentRequestHubStatus.Active || !endDate) {
    // No bundle request yet, or not usable yet (queued/pending/provisioning/failed).
    return { state: 'no-trial', daysLeft: null };
  }

  const daysLeft = computeDaysLeft(endDate, now);

  if (daysLeft <= 0) {
    return { state: 'none', daysLeft };
  }

  if (daysLeft <= ENDING_SOON_THRESHOLD_DAYS) {
    return { state: 'ending', daysLeft };
  }

  return { state: 'active', daysLeft };
};
