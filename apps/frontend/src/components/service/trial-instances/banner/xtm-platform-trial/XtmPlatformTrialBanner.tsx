'use client';

import { LearnMoreBannerLink } from '@/components/service/trial-instances/banner/LearnMoreBannerLink';
import { useXtmPlatformTrialBannerDismissed } from '@/components/service/trial-instances/banner/xtm-platform-trial/useXtmPlatformTrialBannerDismissed';
import { XtmPlatformTrialBannerState } from '@/components/service/trial-instances/banner/xtm-platform-trial/xtm-platform-trial-banner.utils';
import { useTranslate } from '@/hooks/use-translate';
import { Banner } from '@filigran/design-system';
import { usePathname } from 'next/navigation';

const TRIAL_PAGE_SLUG = '/xtm-platform-trial';

const TITLE_KEYS = {
  'no-trial': 'Service.Trials.XtmPlatform.NoTrial.Text',
  active: 'Service.Trials.XtmPlatform.Active.Text',
  ending: 'Service.Trials.XtmPlatform.Ending.Text',
} as const;

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

  if (state === 'none' || dismissed) {
    return null;
  }

  // The learn more link points to the trial page: no need to show it there.
  const isOnLearnMorePage = !!pathname?.endsWith(TRIAL_PAGE_SLUG);
  const showLearnMore =
    state === 'no-trial' && !!learnMoreHref && !isOnLearnMorePage;
  const showDaysLeft = state !== 'no-trial' && daysLeft != null;
  const isDismissable = state !== 'ending';

  const handleDismiss = () => {
    dismiss();
    // The close button unmounts with the banner: hand the focus to the page
    // content rather than dropping it on the body (Banner RULE-04).
    const main = document.querySelector('main');
    main?.setAttribute('tabindex', '-1');
    main?.focus();
  };

  return (
    <Banner
      variant={state === 'ending' ? 'warning' : 'default'}
      action={
        showLearnMore ? <LearnMoreBannerLink href={learnMoreHref} /> : undefined
      }
      onDismiss={isDismissable ? handleDismiss : undefined}
      dismissLabel={t('Utils.Close')}>
      {t(TITLE_KEYS[state])}
      {showDaysLeft && (
        <>
          {' '}
          <strong>
            {t('Service.Trials.XtmPlatform.DaysLeft', { days: daysLeft })}
          </strong>
        </>
      )}
    </Banner>
  );
};
