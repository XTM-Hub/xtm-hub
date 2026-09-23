'use client';
import { PlatformIdentifier } from '@graphql/generated';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { useTranslate } from '@/hooks/use-translate';
import React from 'react';

interface TrialsHeaderProps {
  actions?: React.ReactNode;
  platformIdentifier?: PlatformIdentifier;
}

export const TrialsHeader = ({
  actions,
  platformIdentifier = PlatformIdentifier.Opencti,
}: TrialsHeaderProps) => {
  const t = useTranslate();
  const platformName = PlatformMetadataMapping[platformIdentifier].name;

  return (
    <header className="px-m pt-m pb-xxl text-center">
      <div className="flex flex-col gap-s">
        <p className="text-filigran-brand-primary font-bold">
          {t('Service.Trials.PageHeader.Welcome')}
        </p>
        <h1 className="heading-2xl">
          {t('Service.Trials.PageHeader.Title', { platformName })}
        </h1>
      </div>
      <div className="flex flex-wrap justify-center gap-s mt-l">{actions}</div>
    </header>
  );
};
