'use client';

import { useTranslate } from '@/hooks/use-translate';
import { Alert } from '@filigran/design-system';

export const XtmPlatformTrialLimitations = () => {
  const t = useTranslate();
  return (
    <Alert
      severity="info"
      title={t('Service.Trials.XtmPlatform.Page.Limitations.Title')}
      description={
        // Alert renders the description in a <p>, which cannot hold a <p> or a <ul>.
        <>
          <span className="block">
            {t('Service.Trials.XtmPlatform.Page.Limitations.Intro')}
          </span>
          <span
            role="list"
            className="my-2 block list-disc pl-4">
            <span
              role="listitem"
              className="list-item">
              {t('Service.Trials.XtmPlatform.Page.Limitations.OpenCTI')}
            </span>
            <span
              role="listitem"
              className="list-item">
              {t('Service.Trials.XtmPlatform.Page.Limitations.OpenAEV')}
            </span>
          </span>
          <span className="block text-xs">
            {t('Service.Trials.XtmPlatform.Page.Limitations.Ingestion')}
          </span>
          <span className="block text-xs">
            {t('Service.Trials.XtmPlatform.Page.Limitations.NoSLA')}
          </span>
        </>
      }
    />
  );
};
