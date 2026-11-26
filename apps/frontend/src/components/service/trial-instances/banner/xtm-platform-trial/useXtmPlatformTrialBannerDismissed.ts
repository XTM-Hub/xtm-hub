import { useHasMounted } from '@/hooks/use-has-mounted';
import { useLocalStorage } from 'usehooks-ts';
import { XtmPlatformTrialBannerState } from './xtm-platform-trial-banner.utils';

const DISMISSIBLE_STATES = ['no-trial', 'active'] as const;
type DismissibleXtmPlatformTrialBannerState =
  (typeof DISMISSIBLE_STATES)[number];

const isDismissibleState = (
  state: XtmPlatformTrialBannerState
): state is DismissibleXtmPlatformTrialBannerState =>
  (DISMISSIBLE_STATES as readonly string[]).includes(state);

interface UseXtmPlatformTrialBannerDismissedResult {
  dismissed: boolean;
  dismiss: () => void;
}

/**
 * Tracks whether the XTM Platform trial banner has been dismissed for a
 * given state, using one localStorage key per dismissable state. This
 * ensures switching from the "active" state to the non-dismissable
 * "ending" state always shows the banner again regardless of a prior
 * dismissal, and a prior "active" dismissal doesn't leak into a later
 * fresh "no-trial" state.
 *
 * localStorage isn't available during SSR/the first client render, so we
 * report "dismissed" until mounted to avoid briefly flashing the banner
 * before hiding it once the real stored value is read.
 */
export const useXtmPlatformTrialBannerDismissed = (
  state: XtmPlatformTrialBannerState
): UseXtmPlatformTrialBannerDismissedResult => {
  const hasMounted = useHasMounted();

  const [noTrialDismissed, setNoTrialDismissed] = useLocalStorage(
    'xtmPlatformTrialBannerDismissed_noTrial',
    false
  );
  const [activeDismissed, setActiveDismissed] = useLocalStorage(
    'xtmPlatformTrialBannerDismissed_active',
    false
  );

  if (!isDismissibleState(state)) {
    return { dismissed: false, dismiss: () => {} };
  }

  if (state === 'no-trial') {
    return {
      dismissed: !hasMounted || noTrialDismissed,
      dismiss: () => setNoTrialDismissed(true),
    };
  }

  return {
    dismissed: !hasMounted || activeDismissed,
    dismiss: () => setActiveDismissed(true),
  };
};
