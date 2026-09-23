import * as React from 'react';

import '@styles/globals.css';

import { AdminBanner } from '@/components/admin/AdminBanner';
import { TestEnvBanner } from '@/components/admin/TestEnvBanner';
import { EditionModeBanner } from '@/components/content-translation/EditionModeBanner';
import { EditModeContentObserver } from '@/components/content-translation/EditModeContentObserver';
import HeaderComponent from '@/components/Header';
import { AppShell } from '@/components/layout/AppShell';
import PrivateMenu from '@/components/menu/PrivateMenu';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { PrivateXtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner';
import { EditModeProvider } from '@/context/edit-mode-context';
import { loadOverriddenContentKeys } from '@/i18n/content-translation-overrides';
import { RelayProvider } from '@/relay/relay-provider';
import {
  hasContentEditCapability,
  isContentEditModeActive,
} from '@/utils/content-translation/content-edit-mode.server';
import { loadContentTranslationDrafts } from '@/utils/content-translation/content-translation-drafts.server';
import { countPendingChanges } from '@/utils/content-translation/pending-changes';
import { loadMeUser } from '@/utils/load-me-user';
import { getMetadataBase } from '@/utils/metadata';
import { APP_PATH } from '@/utils/path/constant';
import { buildSignupRedirect } from '@/utils/redirect';
import { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import PageLoader from './page-loader';

export const dynamic = 'force-dynamic';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'XTM Hub',
    description: 'XTM Hub application by Filigran',
    metadataBase: await getMetadataBase(),
  };
};

// Component interface
interface RootLayoutProps {
  children: React.ReactNode;
}

// Component
const RootLayout = async ({ children }: RootLayoutProps) => {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? `/${APP_PATH}`;

  const me = await loadMeUser();
  if (!me) {
    redirect(buildSignupRedirect(pathname));
  }

  const isEditMode = await isContentEditModeActive();
  const pendingChangeCount = countPendingChanges(
    await loadContentTranslationDrafts()
  );
  const overriddenKeys = await loadOverriddenContentKeys(await getLocale());

  const banners = (
    <>
      <TestEnvBanner />
      <AdminBanner />
      <EditionModeBanner />
      <PrivateXtmPlatformTrialBanner />
    </>
  );

  return (
    <RelayProvider>
      <ReactQueryProvider>
        <div className="flex min-h-screen">
          <PageLoader>
            <EditModeProvider
              canEditContent={hasContentEditCapability(me)}
              isEditMode={isEditMode}
              pendingChangeCount={pendingChangeCount}
              overriddenKeys={overriddenKeys}>
              <AppShell
                banners={banners}
                menu={<PrivateMenu />}
                headerContent={<HeaderComponent />}
                contentClassName="p-3 sm:p-6">
                {children}
              </AppShell>
              <EditModeContentObserver />
            </EditModeProvider>
          </PageLoader>
        </div>
      </ReactQueryProvider>
    </RelayProvider>
  );
};

// Component export
export default RootLayout;
