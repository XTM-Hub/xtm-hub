'use client';

import { EMBED_SEGMENT } from '@/components/cookie-consent/cookie-consent.consts';
import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { CookieConsentPreferences } from '@/components/cookie-consent/CookieConsentPreferences';
import { useSelectedLayoutSegment } from 'next/navigation';

export const CookieConsent = () => {
  const segment = useSelectedLayoutSegment();
  if (segment === EMBED_SEGMENT) {
    return null;
  }
  return (
    <>
      <CookieConsentBanner />
      <CookieConsentPreferences />
    </>
  );
};
