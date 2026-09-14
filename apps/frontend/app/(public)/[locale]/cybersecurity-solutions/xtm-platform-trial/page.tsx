import { PublicXtmPlatformTrialPanel } from '@/components/service/trial-instances/xtm-platform-trial/PublicXtmPlatformTrialPanel';
import { XtmPlatformTrialPage } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialPage';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import type { PublicLocale } from '@/i18n/config';
import {
  buildFiligranOrganizationJsonLd,
  buildSeoPageMetadata,
  getBaseUrl,
  stringifyJsonLd,
} from '@/utils/generate-metadata';
import { loadCurrentUser } from '@/utils/load-me-user';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import { isFeatureEnabled } from '@/utils/settings.service';
import { FeatureFlag } from '@graphql/generated';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

const PATHNAME = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/xtm-platform-trial`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: PublicLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = await getBaseUrl();
  const t = await getTranslations({
    locale,
  });

  return buildSeoPageMetadata({
    baseUrl,
    locale,
    pathname: PATHNAME,
    title: `${t('Service.Trials.XtmPlatform.Page.Title')} | XTM Hub`,
    description: t('Service.Trials.XtmPlatform.Page.PitchDescription'),
    imageAlt: t('Service.Trials.XtmPlatform.Page.PitchTitle'),
  });
}

const Page = async ({
  params,
}: {
  params: Promise<{ locale: PublicLocale }>;
}) => {
  const xtmPlatformTrialEnabled = await isFeatureEnabled(
    FeatureFlag.XtmPlatformTrial
  );
  if (!xtmPlatformTrialEnabled) {
    notFound();
  }

  const user = await loadCurrentUser();
  if (user) {
    redirect(`/${APP_PATH}/service/xtm-platform-trial`);
  }

  const { locale } = await params;
  const baseUrl = await getBaseUrl();
  const t = await getTranslations();

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${locale}`,
    },
    {
      label: t('Service.Trials.XtmPlatform.Page.Breadcrumb'),
      original: true,
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${t('Service.Trials.XtmPlatform.Page.Title')} | XTM Hub`,
    description: t('Service.Trials.XtmPlatform.Page.PitchDescription'),
    url: `${baseUrl}${PATHNAME}`,
    publisher: buildFiligranOrganizationJsonLd(baseUrl),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
      />
      <BreadcrumbNav value={breadcrumbs} />
      <XtmPlatformTrialPage panel={<PublicXtmPlatformTrialPanel />} />
    </>
  );
};

export default Page;
