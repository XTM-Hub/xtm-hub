import { PrefetchedFeatureVotingList } from '@/components/feature-voting/PrefetchedFeatureVotingList';
import { getFeatureVotingPrivatePath } from '@/components/feature-voting/feature-voting-path';
import type { PublicLocale } from '@/i18n/config';
import { buildSeoPageMetadata, getBaseUrl } from '@/utils/generate-metadata';
import { loadCurrentUser } from '@/utils/load-me-user';
import {
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
  XTM_PLATFORM_ROADMAP_SLUG,
} from '@/utils/path/constant';
import { fetchSeoServiceInstanceBySlug } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

const ROADMAP_PATH = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${XTM_PLATFORM_ROADMAP_SLUG}`;

/** The voting round belongs to the roadmap service instance behind that slug. */
const getRoadmapServiceInstance = cache(() =>
  fetchSeoServiceInstanceBySlug(XTM_PLATFORM_ROADMAP_SLUG)
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: PublicLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FeatureVoting' });
  const baseUrl = await getBaseUrl();

  return buildSeoPageMetadata({
    baseUrl,
    locale,
    pathname: `${ROADMAP_PATH}/feature-voting`,
    title: `${t('Title')} | XTM Hub`,
    description: t('MetaDescription'),
    imageAlt: t('Title'),
  });
}

const Page = async ({
  params,
}: {
  params: Promise<{ locale: PublicLocale }>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);

  // Independent lookups: loadCurrentUser resolves to null on failure, so it is
  // harmless to call it even when the service instance turns out to be missing.
  const [serviceInstance, user] = await Promise.all([
    getRoadmapServiceInstance(),
    loadCurrentUser(),
  ]);
  if (!serviceInstance) {
    notFound();
  }

  if (user) {
    redirect(getFeatureVotingPrivatePath(serviceInstance.id));
  }

  return (
    <PrefetchedFeatureVotingList
      serviceInstanceId={serviceInstance.id}
      roadmapHref={`/${locale}${ROADMAP_PATH}`}
    />
  );
};

export default Page;
