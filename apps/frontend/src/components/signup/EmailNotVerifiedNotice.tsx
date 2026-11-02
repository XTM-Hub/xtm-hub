'use client';

import { getResendVerificationEmailErrorMessageKeys } from '@/components/signup/resend-verification-email.utils';
import {
  EMAIL_NOT_VERIFIED_ERROR,
  SIGN_UP_ERROR_PARAM,
} from '@/components/signup/sign-up-error.const';
import { useResendVerificationEmail } from '@/components/signup/use-resend-verification-email';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { Alert, Button } from '@filigran/design-system';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface EmailNotVerifiedNoticeProps {
  className?: string;
}

/**
 * Persistent counterpart of the email-not-verified snackbar, with a way to get
 * a new verification email.
 */
export const EmailNotVerifiedNotice = ({
  className,
}: EmailNotVerifiedNoticeProps) => {
  const t = useTranslate();
  const searchParams = useSearchParams();
  const { mutate, isPending, isSuccess } = useResendVerificationEmail();

  // `SignUpErrorSnackbar` drops the param right after mount: remember it.
  const error = searchParams.get(SIGN_UP_ERROR_PARAM);
  const [reason, setReason] = useState(error);
  if (error && error !== reason) {
    setReason(error);
  }

  if (reason !== EMAIL_NOT_VERIFIED_ERROR) {
    return null;
  }

  const resend = () =>
    mutate(undefined, {
      onSuccess: () =>
        showSnackbar({
          severity: 'success',
          title: t('SignUpPage.ResendVerificationEmail.Success.Title'),
          description: t(
            'SignUpPage.ResendVerificationEmail.Success.Description'
          ),
        }),
      onError: (mutationError) => {
        const { title, description } =
          getResendVerificationEmailErrorMessageKeys(mutationError);
        showSnackbar({
          severity: 'error',
          title: t(title),
          description: t(description),
        });
      },
    });

  return (
    <Alert
      severity="warning"
      className={className}
      title={t('SignUpPage.EmailNotVerifiedError.Title')}
      description={t('SignUpPage.EmailNotVerifiedError.Description')}
      action={
        <Button
          priority="secondary"
          size="sm"
          loading={isPending}
          // One email is enough: a sent one stays sent for the page's life.
          disabled={isSuccess}
          onClick={resend}>
          {t(
            isSuccess
              ? 'SignUpPage.ResendVerificationEmail.Sent'
              : 'SignUpPage.ResendVerificationEmail.Button'
          )}
        </Button>
      }
    />
  );
};

export default EmailNotVerifiedNotice;
