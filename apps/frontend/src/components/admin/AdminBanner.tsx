'use client';

import useAdminPath from '@/hooks/use-admin-path';
import { useTranslate } from '@/hooks/use-translate';
import { Banner } from '@filigran/design-system';

export const AdminBanner = () => {
  const t = useTranslate();
  const isAdminPath = useAdminPath();

  return isAdminPath && <Banner variant="warning">{t('AdminBanner')}</Banner>;
};
