'use client';

import { useTranslate } from '@/hooks/use-translate';
import { publicLocales } from '@/i18n/config';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  buildOidcRedirect,
  buildPublicCounterpartTarget,
  buildSignupRedirect,
} from '@/utils/redirect';

import { Button } from '@filigran/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const PublicHeaderAuthButtons = () => {
  const t = useTranslate();
  const pathname = usePathname();
  const isHomepage = publicLocales.some((locale) => pathname === `/${locale}`);
  const redirectTarget =
    pathname && !isHomepage
      ? buildPublicCounterpartTarget(pathname)
      : undefined;

  return (
    <>
      <Button
        asChild
        priority="secondary">
        <Link
          {...analyticsId('account_login_open')}
          href={buildOidcRedirect(redirectTarget)}
          prefetch={false}>
          {t('PublicLayout.Login')}
        </Link>
      </Button>
      <Button
        asChild
        className="whitespace-nowrap">
        <Link
          {...analyticsId('account_signup_open')}
          href={buildSignupRedirect(redirectTarget)}>
          {t('PublicLayout.SignUp')}
        </Link>
      </Button>
    </>
  );
};
