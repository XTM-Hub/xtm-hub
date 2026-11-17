'use client';

import { useTranslate } from '@/hooks/use-translate';
import { Paper } from '@filigran/design-system';
import React from 'react';

interface ShareableResourceBasicInformationProps {
  children: React.ReactNode;
}

export const ShareableResourceBasicInformation = ({
  children,
}: ShareableResourceBasicInformationProps) => {
  const t = useTranslate();
  return (
    <div className="flex-1">
      <Paper
        as="section"
        padding={16}
        title={
          <h2>{t('Service.ShareableResources.Details.BasicInformation')}</h2>
        }>
        <div className="space-y-6">{children}</div>
      </Paper>
    </div>
  );
};
