'use client';

import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { Alert } from '@filigran/design-system';

export const AdminBanner = () => {
  const t = useTranslate();
  const isAdminPath = useAdminPath();

  return (
    isAdminPath && (
      <Alert
        severity="warning"
        title={t('AdminBanner')}
      />
    )
  );
};
