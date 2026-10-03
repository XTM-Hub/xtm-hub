'use client';
import { Button } from '@filigran/design-system';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

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
