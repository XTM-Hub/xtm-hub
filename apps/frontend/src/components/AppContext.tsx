'use client';
import { CookieConsent } from '@/components/cookie-consent/CookieConsent';
import { ManagedScripts } from '@/components/cookie-consent/ManagedScripts';
import { useTranslate } from '@/hooks/use-translate';
import { APP_PATH } from '@/utils/path/constant';
import { geologica, ibmPlexSans } from '@app/font';
import { Toaster } from '@filigran/ui';
import { useLocale } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import Head from 'next/head';
import { usePathname } from 'next/navigation';
import * as React from 'react';

// Component interface
interface AppProps {
  children: React.ReactNode;
}

const THEME_SWITCHABLE_PATHS = [`/${APP_PATH}`];

const isThemeSwitchablePath = (pathname: string) => {
  return THEME_SWITCHABLE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
};

// Component
const AppContext = ({ children }: AppProps) => {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslate();
  const forcedTheme = isThemeSwitchablePath(pathname) ? undefined : 'dark';
  return (
    <html
      suppressHydrationWarning
      lang={locale}
      className={`${geologica.variable} ${ibmPlexSans.variable}`}>
      <Head>
        <link
          rel="icon"
          href="/favicon.svg"
          type="image/svg+xml"
        />
        <title>{t('App.Title')}</title>
        <meta
          name="viewport"
          content="initial-scale=1.0, width=device-width"
        />
      </Head>

      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme={forcedTheme}
          enableSystem
          disableTransitionOnChange>
          {children}
          <Toaster />
          <ManagedScripts />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
};

// Component export
export default AppContext;
