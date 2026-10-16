'use client';

import { requestVerificationEmail } from '@/components/signup/resend-verification-email.utils';
import { useMutation } from '@tanstack/react-query';

export const useResendVerificationEmail = () =>
  useMutation({ mutationFn: requestVerificationEmail });
