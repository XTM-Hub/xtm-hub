'use client';

import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { PUBLIC_FEATURE_VOTING_PATH } from '@/utils/path/constant';
import { buildOidcRedirect, buildSignupRedirect } from '@/utils/redirect';

import { Button } from '@filigran/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const PublicHeaderAuthButtons = () => {
  const t = useTranslate();
  const pathname = usePathname();
  const redirectTarget = pathname?.endsWith(PUBLIC_FEATURE_VOTING_PATH)
    ? pathname
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
