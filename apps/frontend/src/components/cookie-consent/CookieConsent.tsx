'use client';

import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { CookieConsentPreferences } from '@/components/cookie-consent/CookieConsentPreferences';
import { useSelectedLayoutSegment } from 'next/navigation';

const EMBED_SEGMENT = '(embed)';

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
