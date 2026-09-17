'use client';

import { InfoIcon } from '@filigran/icon';
import { useTranslations } from 'next-intl';

export const XtmPlatformTrialLimitations = () => {
  const t = useTranslations();
  return (
    <div className="rounded p-m bg-feedback-info-secondary-transparency">
      <h2 className="flex items-center gap-s mb-s heading-xs">
        <InfoIcon className="size-4 text-feedback-info-primary" />
        {t('Service.Trials.XtmPlatform.Page.Limitations.Title')}
      </h2>
      <div className="pl-6 text-text-default-secondary">
        <p className="text-sm">
          {t('Service.Trials.XtmPlatform.Page.Limitations.Intro')}
        </p>
        <ul className="text-sm mb-l list-disc pl-l">
          <li>{t('Service.Trials.XtmPlatform.Page.Limitations.OpenCTI')}</li>
          <li>{t('Service.Trials.XtmPlatform.Page.Limitations.OpenAEV')}</li>
        </ul>
        <p className="text-xs">
          {t('Service.Trials.XtmPlatform.Page.Limitations.Ingestion')}
        </p>
        <p className="text-xs">
          {t('Service.Trials.XtmPlatform.Page.Limitations.NoSLA')}
        </p>
      </div>
    </div>
  );
};
