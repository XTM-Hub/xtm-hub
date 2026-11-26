'use client';

import { XtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { useLocale } from 'next-intl';

export const PublicXtmPlatformTrialBanner = () => {
  const locale = useLocale();

  return (
    <XtmPlatformTrialBanner
      state="no-trial"
      learnMoreHref={`/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/xtm-platform-trial`}
    />
  );
};
