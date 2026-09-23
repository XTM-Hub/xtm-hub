import { useTranslate } from '@/hooks/use-translate';
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
      <h2 className="py-s txt-container-title truncate text-ellipsis text-muted-foreground">
        {t('Service.ShareableResources.Details.BasicInformation')}
      </h2>
      <section className="rounded bg-elevation-background-layer-1 flex space-y-xl p-l">
        <div className="space-y-xl">{children}</div>
      </section>
    </div>
  );
};
