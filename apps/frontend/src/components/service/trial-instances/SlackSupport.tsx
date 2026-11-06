'use client';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsLinkType } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';
import Link from 'next/link';

export const SlackSupportButton = () => {
  const t = useTranslate();

  return (
    <Button asChild>
      <Link
        {...analyticsId('trial_community_support_open')}
        {...analyticsLinkType('Support')}
        href="https://community.filigran.io/"
        target="_blank"
        rel="noopener noreferrer">
        {t('Service.Trials.NeedSupport')}
      </Link>
    </Button>
  );
};
