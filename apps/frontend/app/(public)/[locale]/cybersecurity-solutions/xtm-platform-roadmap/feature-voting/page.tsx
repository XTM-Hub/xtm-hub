import { FeatureVotingList } from '@/components/feature-voting/FeatureVotingList';
import { getFeatureVotingPrivatePath } from '@/components/feature-voting/feature-voting-path';
import type { PublicLocale } from '@/i18n/config';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import { buildSeoPageMetadata, getBaseUrl } from '@/utils/generate-metadata';
import { loadCurrentUser } from '@/utils/load-me-user';
import {
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
  XTM_PLATFORM_ROADMAP_SLUG,
} from '@/utils/path/constant';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import SeoServiceInstanceQuery, {
  seoServiceInstanceQuery,
} from '@generated/seoServiceInstanceQuery.graphql';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

const ROADMAP_PATH = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${XTM_PLATFORM_ROADMAP_SLUG}`;

/** The voting round belongs to the roadmap service instance behind that slug. */
const getRoadmapServiceInstance = cache(async () => {
  const serviceResponse = await serverFetchGraphQL<seoServiceInstanceQuery>(
    SeoServiceInstanceQuery,
    { slug: XTM_PLATFORM_ROADMAP_SLUG },
    { cache: undefined, next: { revalidate: 3600 } }
  );
  return serviceResponse.data
    .seoServiceInstance as unknown as seoServiceInstanceFragment$data;
});

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

  const serviceInstance = await getRoadmapServiceInstance();

  const user = await loadCurrentUser();
  if (user) {
    redirect(getFeatureVotingPrivatePath(serviceInstance.id));
  }

  return (
    <FeatureVotingList
      serviceInstanceId={serviceInstance.id}
      roadmapHref={`/${locale}${ROADMAP_PATH}`}
    />
  );
};

export default Page;
