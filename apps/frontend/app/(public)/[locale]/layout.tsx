import { EditionModeBanner } from '@/components/content-translation/EditionModeBanner';
import { EditModeContentObserver } from '@/components/content-translation/EditModeContentObserver';
import Copilot from '@/components/external/Copilot';
import { AppShell } from '@/components/layout/AppShell';
import { PublicHeaderContent } from '@/components/layout/PublicHeaderContent';
import PublicMenu from '@/components/menu/PublicMenu';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { PublicXtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/PublicXtmPlatformTrialBanner';
import { EditModeProvider } from '@/context/edit-mode-context';
import { type PublicLocale, publicLocales } from '@/i18n/config';
import { loadOverriddenContentKeys } from '@/i18n/content-translation-overrides';
import { isContentEditModeActive } from '@/utils/content-translation/content-edit-mode.server';
import { loadContentTranslationDrafts } from '@/utils/content-translation/content-translation-drafts.server';
import { countPendingChanges } from '@/utils/content-translation/pending-changes';
import { getDefaultMetadata } from '@/utils/generate-metadata';
import { fetchVisibleServiceSlugs } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import '@filigran/ui/theme.css';
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

  const visibleServiceSlugs = await fetchVisibleServiceSlugs();
  const isEditMode = await isContentEditModeActive();
  const pendingChangeCount = countPendingChanges(
    await loadContentTranslationDrafts()
  );
  const overriddenKeys = await loadOverriddenContentKeys();
  // Public pages never load the current user, so only an editor already in
  // edit mode (a verified BYPASS user) gets the toggle here, to turn it off.

  return (
    <ReactQueryProvider>
      <EditModeProvider
        canEditContent={isEditMode}
        isEditMode={isEditMode}
        pendingChangeCount={pendingChangeCount}
        overriddenKeys={overriddenKeys}>
        <AppShell
          banners={
            <>
              <EditionModeBanner />
              <PublicXtmPlatformTrialBanner />
            </>
          }
          menu={<PublicMenu visibleServiceSlugs={visibleServiceSlugs} />}
          headerContent={
            <PublicHeaderContent
              locale={locale}
              visibleServiceSlugs={visibleServiceSlugs}
            />
          }
          contentClassName="container pt-l">
          {children}
        </AppShell>
        <EditModeContentObserver />
      </EditModeProvider>
      <Copilot />
    </ReactQueryProvider>
  );
};

export default RootLayout;
