'use client';

import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { BannerAction } from '@filigran/design-system';
import Link from 'next/link';
import { ComponentProps } from 'react';

type LearnMoreBannerLinkProps = Omit<ComponentProps<typeof Link>, 'children'>;

export const LearnMoreBannerLink = (props: LearnMoreBannerLinkProps) => {
  const t = useTranslate();

  return (
    <BannerAction asChild>
      <Link
        {...props}
        {...analyticsId('trial_details_open')}>
        {t('Service.Trials.LearnMore.Link')}
      </Link>
    </BannerAction>
  );
};
