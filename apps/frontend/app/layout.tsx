import AppContext from '@/components/AppContext';
import { CookieConsentProvider } from '@/components/cookie-consent/CookieConsentProvider';
import { readServerConsent } from '@/components/cookie-consent/cookie-consent.server';
import I18nContext from '@/i18n/i18n-context';
import { getMetadataBase } from '@/utils/metadata';
import { isProductionPlatform } from '@/utils/platform-environment/platform-environment.server';
import { Metadata } from 'next';
import * as React from 'react';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'XTM Hub',
    description: 'XTM Hub application by Filigran',
    metadataBase: await getMetadataBase(),
  };
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = async ({ children }: RootLayoutProps) => {
  const [initialConsent, loadThirdPartyScripts] = await Promise.all([
    readServerConsent(),
    isProductionPlatform(),
  ]);
  return (
    <I18nContext>
      <CookieConsentProvider initialConsent={initialConsent}>
        <AppContext loadThirdPartyScripts={loadThirdPartyScripts}>
          {children}
        </AppContext>
      </CookieConsentProvider>
    </I18nContext>
  );
};

export default RootLayout;
