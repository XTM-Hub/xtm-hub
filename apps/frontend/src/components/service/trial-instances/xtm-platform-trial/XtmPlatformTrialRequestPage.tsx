'use client';

import { XtmPlatformTrialPitch } from '@/components/service/trial-instances/xtm-platform-trial/request-pitch/XtmPlatformTrialPitch';
import { XtmPlatformTrialLimitations } from '@/components/service/trial-instances/xtm-platform-trial/shared/XtmPlatformTrialLimitations';
import { useTranslate } from '@/hooks/use-translate';
import { ReactNode } from 'react';

interface XtmPlatformTrialPageProps {
  panel: ReactNode;
  showLimitations?: boolean;
  title?: string;
}

export const XtmPlatformTrialRequestPage = ({
  panel,
  showLimitations = false,
  title,
}: XtmPlatformTrialPageProps) => {
  const t = useTranslate();
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="title-sm text-gradient-focus w-fit">
          {t('Service.Trials.XtmPlatform.Page.Overline')}
        </p>
        <h1 className="title-2xl">
          {title ?? t('Service.Trials.XtmPlatform.Page.Title')}
        </h1>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6 ml-8">
          <XtmPlatformTrialPitch />
          {showLimitations && <XtmPlatformTrialLimitations />}
        </div>
        <div className="w-full lg:w-[521px] lg:shrink-0">{panel}</div>
      </div>
    </div>
  );
};
