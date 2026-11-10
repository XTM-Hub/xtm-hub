'use client';

import { useTranslate } from '@/hooks/use-translate';
import { publicLocales } from '@/i18n/config';
import {
  buildOidcRedirect,
  buildPrivateCounterpartTarget,
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
      ? buildPrivateCounterpartTarget(pathname)
      : undefined;

  return (
    <>
      <Button
        asChild
        priority="secondary">
        <Link
          href={buildOidcRedirect(redirectTarget)}
          prefetch={false}>
          {t('PublicLayout.Login')}
        </Link>
      </Button>
      <Button
        asChild
        className="whitespace-nowrap">
        <Link href={buildSignupRedirect(redirectTarget)}>
          {t('PublicLayout.SignUp')}
        </Link>
      </Button>
    </>
  );
};
