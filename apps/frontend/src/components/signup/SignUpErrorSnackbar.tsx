'use client';

import {
  EMAIL_NOT_VERIFIED_ERROR,
  SIGN_UP_ERROR_PARAM,
} from '@/components/signup/sign-up-error.const';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

interface SignUpErrorMessageKeys {
  title: string;
  description: string;
}

// Any reason other than an unverified email, known (`login-failed`) or not,
// falls back to the generic message also shown by the login page.
const getSignUpErrorMessageKeys = (error: string): SignUpErrorMessageKeys =>
  error === EMAIL_NOT_VERIFIED_ERROR
    ? {
        title: 'SignUpPage.EmailNotVerifiedError.Title',
        description: 'SignUpPage.EmailNotVerifiedError.Description',
      }
    : {
        title: 'UnexpectedErrorDialog.Title',
        description: 'UnexpectedErrorDialog.Description',
      };

/**
 * Shows the reason of a failed OIDC sign-in, sent by the backend as
 * `?error=<reason>`, then drops the param so a refresh does not show it again.
 * `EmailNotVerifiedNotice` keeps the reason past that cleanup.
 */
export const SignUpErrorSnackbar = () => {
  const t = useTranslate();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const error = searchParams.get(SIGN_UP_ERROR_PARAM);

  useEffect(() => {
    if (!error) {
      return;
    }

    const { title, description } = getSignUpErrorMessageKeys(error);
    showSnackbar({
      severity: 'error',
      title: t(title),
      description: t(description),
    });

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete(SIGN_UP_ERROR_PARAM);
    const nextSearch = nextSearchParams.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname);
  }, [error, pathname, router, searchParams, t]);

  return null;
};

export default SignUpErrorSnackbar;
