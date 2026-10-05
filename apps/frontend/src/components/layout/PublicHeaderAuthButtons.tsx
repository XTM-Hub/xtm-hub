'use client';

import { useTranslate } from '@/hooks/use-translate';
import { PUBLIC_FEATURE_VOTING_PATH } from '@/utils/path/constant';
import { buildOidcRedirect, buildSignupRedirect } from '@/utils/redirect';
import { Button } from '@filigran/ui/servers';
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
        variant="secondary">
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
