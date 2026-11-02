import * as React from 'react';

import '@styles/embed.css';
import '@styles/globals.css';

import { serverMutateGraphQL } from '@/relay/server-portal-api-fetch';

import { SharedContent } from '@/components/layout/SharedContent';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { ErrorPage } from '@/components/ui/ErrorPage';
import { RelayProvider } from '@/relay/relay-provider';
import { loadMeUser } from '@/utils/load-me-user';
import { getMetadataBase } from '@/utils/metadata';
import errorFrontendLogMutationNode, {
  errorFrontendLogMutation,
} from '@generated/errorFrontendLogMutation.graphql';
import LogoXTMDark from '@public/logo_xtm_hub_dark.svg';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PageLoader from './page-loader';

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
  let shouldRedirect = false;
  let hasError = false;

  try {
    const me = await loadMeUser();
    if (!me) {
      shouldRedirect = true;
    }
  } catch (error) {
    await serverMutateGraphQL<errorFrontendLogMutation>(
      errorFrontendLogMutationNode,
      {
        message: `EmbedLayout: unexpected ${(error as Error).name} error ${(error as Error).message}`,
        componentStack: 'app/(embed)/Layout.tsx',
      }
    );
    hasError = true;
  }

  if (shouldRedirect) {
    redirect(`/`);
  }

  if (hasError) {
    return (
      <div className="flex flex-col w-full h-[calc(100dvh-var(--cookie-banner-height,0px))]">
        <ErrorPage>
          <p className="text-center">
            We&#39;re sorry, something went wrong
            <br />
            We&#39;re currently troubleshooting the issue. Please try again in a
            few minutes.
          </p>
        </ErrorPage>
      </div>
    );
  }

  return (
    <RelayProvider>
      <ReactQueryProvider>
        <PageLoader>
          <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-var(--cookie-banner-height,0px))]">
            <div className="w-1/3">
              <LogoXTMDark className="pb-6" />

              <SharedContent className="flex flex-col bg-gradient-default px-3 pt-3 sm:px-6 sm:p-6">
                {children}
              </SharedContent>
            </div>
          </div>
        </PageLoader>
      </ReactQueryProvider>
    </RelayProvider>
  );
};

// Component export
export default RootLayout;
