'use client';

import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { Alert } from '@filigran/design-system';
import Link from 'next/link';
import { useContext } from 'react';

export const TestEnvBanner = () => {
  const t = useTranslate();
  const { settings } = useContext(SettingsContext);

  return (
    settings?.environment &&
    settings.environment !== 'production' && (
      <Alert
        severity="warning"
        title={
          <>
            {t('TestEnvBanner', {
              environnement: settings?.environment,
            })}
            <Link
              href="https://hub.filigran.io/"
              className="ml-xs underline">
              {t('GoToProd')}
            </Link>
          </>
        }
      />
    )
  );
};
