'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@filigran/design-system';

export const SlackSupportButton = () => {
  const t = useTranslations();

  return (
    <Button>
      <Link
        href="https://community.filigran.io/"
        target="_blank"
        rel="noopener noreferrer">
        {t('Service.Trials.NeedSupport')}
      </Link>
    </Button>
  );
};
