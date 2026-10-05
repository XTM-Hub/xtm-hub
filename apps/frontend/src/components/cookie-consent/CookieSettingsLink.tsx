'use client';

import { useConsent } from '@/components/cookie-consent/CookieConsentProvider';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { Button } from '@filigran/ui';

export const CookieSettingsLink = ({ className }: { className?: string }) => {
  const t = useTranslate('CookieConsent');
  const { openPreferences } = useConsent();

  return (
    <Button
      variant="link"
      onClick={openPreferences}
      className={cn(
        'h-auto p-0 no-underline hover:no-underline cursor-pointer text-content-body-compact-link',
        className
      )}>
      {t('CookieSettingsLink')}
    </Button>
  );
};
