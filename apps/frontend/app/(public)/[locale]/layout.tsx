import Copilot from '@/components/external/Copilot';
import { AppShell } from '@/components/layout/AppShell';
import { PublicHeaderContent } from '@/components/layout/PublicHeaderContent';
import PublicMenu from '@/components/menu/PublicMenu';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { PublicTryFiligranProductsBanner } from '@/components/service/trial-instances/banner/PublicTryFiligranProductsBanner';
import { PublicXtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/PublicXtmPlatformTrialBanner';
import { type PublicLocale, publicLocales } from '@/i18n/config';
import { getDefaultMetadata } from '@/utils/generate-metadata';
import { fetchVisibleServiceSlugs } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { isFeatureEnabled } from '@/utils/settings.service';
import '@filigran/ui/theme.css';
import { FeatureFlag } from '@graphql/generated';
import '@styles/globals.css';
import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as React from 'react';

export function generateStaticParams() {
  return publicLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: PublicLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return await getDefaultMetadata(locale, '/');
}

const RootLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  if (!publicLocales.includes(locale as PublicLocale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [visibleServiceSlugs, xtmPlatformTrialEnabled] = await Promise.all([
    fetchVisibleServiceSlugs(),
    isFeatureEnabled(FeatureFlag.XtmPlatformTrial),
  ]);

  return (
    <ReactQueryProvider>
      <AppShell
        banners={
          xtmPlatformTrialEnabled ? (
            <PublicXtmPlatformTrialBanner />
          ) : (
            <PublicTryFiligranProductsBanner />
          )
        }
        menu={
          <PublicMenu
            visibleServiceSlugs={visibleServiceSlugs}
            isXtmPlatformTrialEnabled={xtmPlatformTrialEnabled}
          />
        }
        headerContent={
          <PublicHeaderContent
            locale={locale}
            visibleServiceSlugs={visibleServiceSlugs}
            isXtmPlatformTrialEnabled={xtmPlatformTrialEnabled}
          />
        }
        contentClassName="container pt-l">
        {children}
      </AppShell>
      <Copilot />
    </ReactQueryProvider>
  );
};

export default RootLayout;
