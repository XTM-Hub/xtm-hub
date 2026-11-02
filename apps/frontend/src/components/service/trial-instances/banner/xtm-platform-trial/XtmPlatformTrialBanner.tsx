'use client';

import { LearnMoreBannerLink } from '@/components/service/trial-instances/banner/LearnMoreBannerLink';
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
  const pathname = usePathname();

  if (state === 'none') {
    return null;
  }

  // The learn more link points to the trial page: no need to show it there.
  const isOnLearnMorePage = !!pathname?.endsWith(TRIAL_PAGE_SLUG);
  const showLearnMore =
    state === 'no-trial' && !!learnMoreHref && !isOnLearnMorePage;
  const showDaysLeft = state !== 'no-trial' && daysLeft != null;

  return (
    <Banner
      variant={state === 'ending' ? 'warning' : 'default'}
      action={
        showLearnMore ? <LearnMoreBannerLink href={learnMoreHref} /> : undefined
      }>
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
