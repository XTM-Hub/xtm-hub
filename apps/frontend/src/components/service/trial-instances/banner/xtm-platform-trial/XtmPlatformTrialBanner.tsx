'use client';

import { LearnMoreBannerLink } from '@/components/service/trial-instances/banner/LearnMoreBannerLink';
import { useXtmPlatformTrialBannerDismissed } from '@/components/service/trial-instances/banner/xtm-platform-trial/useXtmPlatformTrialBannerDismissed';
import { XtmPlatformTrialBannerState } from '@/components/service/trial-instances/banner/xtm-platform-trial/xtm-platform-trial-banner.utils';
import { CloseIcon } from '@filigran/icon';
import { Badge, Callout } from '@filigran/ui';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();
  const { dismissed, dismiss } = useXtmPlatformTrialBannerDismissed(state);

  if (state === 'none' || dismissed) {
    return null;
  }

  const isDismissable = state !== 'ending';
  const showDaysLeft =
    (state === 'active' || state === 'ending') && daysLeft != null;

  const text =
    state === 'no-trial'
      ? t('Service.Trials.XtmPlatform.NoTrial.Text')
      : state === 'active'
        ? t('Service.Trials.XtmPlatform.Active.Text')
        : t('Service.Trials.XtmPlatform.Ending.Text');

  return (
    <Callout
      className={`relative rounded-none justify-center from-blue to-turquoise-300 bg-linear-to-r ${isDismissable ? 'pr-xxl' : ''}`}>
      <div className="flex items-center gap-s">
        <span>{text}</span>
        {state === 'no-trial' && learnMoreHref && (
          <LearnMoreBannerLink href={learnMoreHref} />
        )}
        {showDaysLeft && (
          <Badge
            variant="outline"
            className="border-black-1000">
            <span className="text-black-1000 font-semibold">
              {t('Service.Trials.XtmPlatform.DaysLeft', { days: daysLeft })}
            </span>
          </Badge>
        )}
      </div>
      {isDismissable && (
        <button
          type="button"
          aria-label={t('Utils.Close')}
          onClick={dismiss}
          className="absolute inset-y-0 right-l flex items-center">
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
    </Callout>
  );
};
