'use client';

import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@filigran/ui/servers';
import Link from 'next/link';

interface LearnMoreBannerLinkProps {
  href: string;
}

export const LearnMoreBannerLink = ({ href }: LearnMoreBannerLinkProps) => {
  const t = useTranslate();

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: 'secondary' }),
        'ml-s mr-s text-[12px] px-2 py-0.5 min-h-0 h-auto text-inherit border-current hover:bg-current/10 focus-visible:ring-current/70'
      )}>
      {t('Service.Trials.LearnMore.Link')}
    </Link>
  );
};
