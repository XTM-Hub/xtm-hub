'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { buttonVariants } from '@filigran/design-system';

interface LearnMoreBannerLinkProps {
  href: string;
}

export const LearnMoreBannerLink = ({ href }: LearnMoreBannerLinkProps) => {
  const t = useTranslations();

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ priority: 'secondary' }),
        'ml-s mr-s text-[12px] px-2 py-0.5 min-h-0 h-auto text-inherit border-current hover:bg-current/10 focus-visible:ring-current/70'
      )}>
      {t('Service.Trials.LearnMore.Link')}
    </Link>
  );
};
