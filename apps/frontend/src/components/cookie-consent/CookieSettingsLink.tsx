'use client';

import { useConsent } from '@/components/cookie-consent/CookieConsentProvider';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { Button } from '@filigran/design-system';

export const CookieSettingsLink = ({ className }: { className?: string }) => {
  const t = useTranslate('CookieConsent');
  const { openPreferences } = useConsent();

  return (
    <Button
      priority="tertiary"
      onClick={openPreferences}
      className={cn(
        'h-auto cursor-pointer p-0 font-normal underline text-content-body-compact-link',
        className
      )}>
      {t('CookieSettingsLink')}
    </Button>
  );
};
