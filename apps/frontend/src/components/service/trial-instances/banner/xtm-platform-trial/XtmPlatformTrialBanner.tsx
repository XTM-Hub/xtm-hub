'use client';

import { LearnMoreBannerLink } from '@/components/service/trial-instances/banner/LearnMoreBannerLink';
import { useXtmPlatformTrialBannerDismissed } from '@/components/service/trial-instances/banner/xtm-platform-trial/useXtmPlatformTrialBannerDismissed';
import { XtmPlatformTrialBannerState } from '@/components/service/trial-instances/banner/xtm-platform-trial/xtm-platform-trial-banner.utils';
import { useTranslate } from '@/hooks/use-translate';
import { Alert, Chip, Snackbar } from '@filigran/design-system';
import { usePathname } from 'next/navigation';

const TRIAL_PAGE_SLUG = '/xtm-platform-trial';

interface XtmPlatformTrialBannerProps {
  state: XtmPlatformTrialBannerState;
  daysLeft?: number | null;
  learnMoreHref?: string;
}

export const XtmPlatformTrialBanner = ({
  state,
  daysLeft,
  learnMoreHref,
}: XtmPlatformTrialBannerProps) => {
  const t = useTranslate();
  const { dismissed, dismiss } = useXtmPlatformTrialBannerDismissed(state);
  const pathname = usePathname();

  if (state === 'none') {
    return null;
  }

  const daysLeftChip =
    (state === 'active' || state === 'ending') && daysLeft != null ? (
      <Chip
        label={t('Service.Trials.XtmPlatform.DaysLeft', { days: daysLeft })}
      />
    ) : undefined;

  if (state === 'ending') {
    return (
      <Alert
        severity="info"
        title={t('Service.Trials.XtmPlatform.Ending.Text')}
        action={daysLeftChip}
      />
    );
  }

  // The learn more link points to the trial page: no need to show it there.
  const isOnLearnMorePage = !!pathname?.endsWith(TRIAL_PAGE_SLUG);
  const showLearnMore =
    state === 'no-trial' && !!learnMoreHref && !isOnLearnMorePage;

  return (
    // Kept mounted once dismissed: unmounting it would skip its exit animation.
    <Snackbar
      open={!dismissed}
      onOpenChange={(open) => {
        if (!open) {
          dismiss();
        }
      }}
      duration={Infinity}
      severity="info"
      title={
        state === 'no-trial'
          ? t('Service.Trials.XtmPlatform.NoTrial.Text')
          : t('Service.Trials.XtmPlatform.Active.Text')
      }
      description={daysLeftChip}
      action={
        showLearnMore ? <LearnMoreBannerLink href={learnMoreHref} /> : undefined
      }
      actionAltText={
        showLearnMore ? t('Service.Trials.LearnMore.Link') : undefined
      }
      closeLabel={t('Utils.Close')}
    />
  );
};
