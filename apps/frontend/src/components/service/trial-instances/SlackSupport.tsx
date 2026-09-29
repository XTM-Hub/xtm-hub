'use client';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/ui/servers';
import Link from 'next/link';

export const SlackSupportButton = () => {
  const t = useTranslate();

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
