'use client';

import { useConsent } from '@/components/cookie-consent/CookieConsentProvider';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from '@filigran/design-system';

export const CookieSettingsLink = ({ className }: { className?: string }) => {
  const t = useTranslations('CookieConsent');
  const { openPreferences } = useConsent();

  return (
    <Button
      priority="tertiary"
      onClick={openPreferences}
      className={cn(
        'h-auto cursor-pointer p-0 underline text-content-body-compact-link',
        className
      )}>
      {t('CookieSettingsLink')}
    </Button>
  );
};
