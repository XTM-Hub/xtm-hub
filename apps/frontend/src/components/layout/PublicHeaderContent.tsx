import { PublicHeaderAuthButtons } from '@/components/layout/PublicHeaderAuthButtons';
import { PublicMobileMenuButton } from '@/components/menu/navigation/public/PublicMobileMenuButton';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import LogoXTMDark from '@public/logo_xtm_hub_dark.svg';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

interface PublicHeaderContentProps {
  locale: string;
  visibleServiceSlugs: string[];
}

export const PublicHeaderContent = async ({
  locale,
  visibleServiceSlugs,
}: PublicHeaderContentProps) => {
  const t = await getTranslations();

  return (
    <>
      <Link
        {...analyticsId('nav_home_open')}
        href={`/${locale}`}
        className="md:hidden">
        <LogoXTMDark className="text-icon-highlight mr-2 h-8 w-auto" />
        <span className="sr-only">{t('Metadata.SiteName')}</span>
      </Link>
      <div className="flex items-center gap-2 ml-auto">
        <PublicHeaderAuthButtons />
        <div className="md:hidden flex items-center">
          <PublicMobileMenuButton visibleServiceSlugs={visibleServiceSlugs} />
        </div>
      </div>
    </>
  );
};
