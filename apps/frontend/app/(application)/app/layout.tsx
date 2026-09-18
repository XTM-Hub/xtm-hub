import * as React from 'react';

import '@styles/globals.css';

import { AdminBanner } from '@/components/admin/AdminBanner';
import { TestEnvBanner } from '@/components/admin/TestEnvBanner';
import HeaderComponent from '@/components/Header';
import { AppShell } from '@/components/layout/AppShell';
import PrivateMenu from '@/components/menu/PrivateMenu';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { PrivateXtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner';
import { RelayProvider } from '@/relay/relay-provider';
import { loadMeUser } from '@/utils/load-me-user';
import { getMetadataBase } from '@/utils/metadata';
import { APP_PATH } from '@/utils/path/constant';
import { buildSignupRedirect } from '@/utils/redirect';
import { isFeatureEnabled } from '@/utils/settings.service';
import { FeatureFlag } from '@graphql/generated';
import { Metadata } from 'next';
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

  const xtmPlatformTrialEnabled = await isFeatureEnabled(
    FeatureFlag.XtmPlatformTrial
  );

  const banners = (
    <>
      <TestEnvBanner />
      <AdminBanner />
      {xtmPlatformTrialEnabled && <PrivateXtmPlatformTrialBanner />}
    </>
  );

  return (
    <RelayProvider>
      <ReactQueryProvider>
        <div className="flex min-h-screen">
          <PageLoader>
            <AppShell
              banners={banners}
              menu={<PrivateMenu />}
              headerContent={<HeaderComponent />}
              contentClassName="p-3 sm:p-6">
              {children}
            </AppShell>
          </PageLoader>
        </div>
      </ReactQueryProvider>
    </RelayProvider>
  );
};

// Component export
export default RootLayout;
