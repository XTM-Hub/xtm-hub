'use client';

import { PENDING_USER_UNAUTHORIZED_ERROR } from '@/components/homepage/pending-user-redirect-error.constants';
import { useTranslate } from '@/hooks/use-translate';
import { useToast } from '@filigran/ui/clients';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const ERROR_PARAM = 'error';

export const PendingUserRedirectErrorToast = () => {
  const t = useTranslate();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const error = searchParams.get(ERROR_PARAM);

  useEffect(() => {
    if (error !== PENDING_USER_UNAUTHORIZED_ERROR) {
      return;
    }

    toast({
      variant: 'destructive',
      title: t('PendingUserRedirect.Unauthorized.Title'),
      description: t('PendingUserRedirect.Unauthorized.Description'),
    });

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete(ERROR_PARAM);
    const nextSearch = nextSearchParams.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname);
  }, [error, pathname, router, searchParams, t, toast]);

  return null;
};

export default PendingUserRedirectErrorToast;
