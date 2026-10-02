import { PublicHeaderAuthButtons } from '@/components/layout/PublicHeaderAuthButtons';
import { PublicMobileMenuButton } from '@/components/menu/navigation/public/PublicMobileMenuButton';
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
        href={`/${locale}`}
        className="md:hidden">
        <LogoXTMDark className="text-primary mr-2 h-8 w-auto" />
        <span className="sr-only">{t('Metadata.SiteName')}</span>
      </Link>
      <div className="flex items-center gap-s ml-auto">
        <PublicHeaderAuthButtons />
        <div className="md:hidden flex items-center">
          <PublicMobileMenuButton visibleServiceSlugs={visibleServiceSlugs} />
        </div>
      </div>
    </>
  );
};
