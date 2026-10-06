'use client';

import { useConsent } from '@/components/cookie-consent/CookieConsentProvider';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';

// A native button rather than the design-system Button: it opens a dialog but
// sits among plain footer links, so it inherits their typography instead of
// the Button's own size, weight and hover background.
export const CookieSettingsLink = ({ className }: { className?: string }) => {
  const t = useTranslate('CookieConsent');
  const { openPreferences } = useConsent();

  return (
    <button
      type="button"
      onClick={openPreferences}
      className={cn('cursor-pointer', className)}>
      {t('CookieSettingsLink')}
    </button>
  );
};
