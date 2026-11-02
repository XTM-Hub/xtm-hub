'use client';

import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { Banner } from '@filigran/design-system';
import Link from 'next/link';
import { useContext } from 'react';

export const TestEnvBanner = () => {
  const t = useTranslate();
  const { settings } = useContext(SettingsContext);

  return (
    settings?.environment &&
    settings.environment !== 'production' && (
      <Banner variant="error">
        {t('TestEnvBanner', {
          environnement: settings?.environment,
        })}{' '}
        <Link href="https://hub.filigran.io/">{t('GoToProd')}</Link>
      </Banner>
    )
  );
};
