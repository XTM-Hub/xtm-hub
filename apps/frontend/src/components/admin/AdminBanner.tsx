'use client';

import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { Callout } from '@filigran/ui';

export const AdminBanner = () => {
  const t = useTranslate();
  const isAdminPath = useAdminPath();

  return (
    isAdminPath && (
      <Callout
        variant="warning"
        className="rounded-none justify-center uppercase">
        {t('AdminBanner')}
      </Callout>
    )
  );
};
