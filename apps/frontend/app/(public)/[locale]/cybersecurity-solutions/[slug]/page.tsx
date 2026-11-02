import {
  getHeroSectionLibraryProps,
  HeroSectionLibrary,
} from '@/components/service/document/ui/HeroSectionLibrary';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { getTranslate } from '@/hooks/get-translate';
import type { PublicLocale } from '@/i18n/config';
import { RelayProvider } from '@/relay/relay-provider';
import { formatPersonNames } from '@/utils/format/name';
import {
  buildFiligranOrganizationJsonLd,
  buildSeoPageMetadata,
  getBaseUrl,
  stringifyJsonLd,
} from '@/utils/generate-metadata';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import {
  fetchSeoServiceInstanceBySlug,
  fetchSeoServiceInstanceMetadata,
  isPublicServiceSlug,
} from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { fetchAllDocuments } from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublicDocumentListPageLoader } from './public-document-list-page-loader';

/**
 * Fetch the data for the page with caching to avoid multiple requests
 */
const getPageData = cache(async (slug: string, locale: PublicLocale) => {
  if (!(await isPublicServiceSlug(slug))) {
    notFound();
  }

  const baseUrl = await getBaseUrl();

  const serviceInstance = await fetchSeoServiceInstanceBySlug(slug);

  if (!serviceInstance) {
    notFound();
  }

  const seoMetadata = await fetchSeoServiceInstanceMetadata(
    serviceInstance.id,
    locale
  );

  const documents = await fetchAllDocuments(
    serviceInstance.slug as ServiceSlug
  );
  return { baseUrl, serviceInstance, seoMetadata, documents };
});

/**
 * Generate the metadata for the page
 *
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: PublicLocale }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const { locale } = awaitedParams;

  const { baseUrl, serviceInstance, seoMetadata } = await getPageData(
    awaitedParams.slug,
    locale
  );
  const pathname = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}`;

  return buildSeoPageMetadata({
    baseUrl,
    locale,
    pathname,
    title: seoMetadata?.meta_title || `${serviceInstance.name} | XTM Hub`,
    description:
      seoMetadata?.meta_description || serviceInstance.description || '',
    imageAlt: serviceInstance.name,
    imageUrl: serviceInstance.illustration_document_id
      ? `${baseUrl}/document/images/${serviceInstance.id}/${serviceInstance.illustration_document_id}`
      : undefined,
  });
}

/**
 * The page component
 */
const Page = async ({
  params,
}: {
  params: Promise<{ slug: string; locale: PublicLocale }>;
}) => {
  const awaitedParams = await params;
  const { locale } = awaitedParams;
  setRequestLocale(locale);
  const t = await getTranslate({ locale });

  const { baseUrl, serviceInstance, seoMetadata, documents } =
    await getPageData(awaitedParams.slug, locale);

  const localizedServiceUrl = `${baseUrl}/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: seoMetadata?.meta_title || serviceInstance.name,
    description: seoMetadata?.meta_description || serviceInstance.description,
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: documents.length * 10,
      bestRating: '5',
      worstRating: '2',
    },
    // datePublished: serviceInstance.created_at,
    // dateModified: serviceInstance.updated_at,
    provider: buildFiligranOrganizationJsonLd(baseUrl),
    keywords: documents
      .flatMap(
        (document) => document.use_cases?.map((useCase) => useCase.name) || []
      )
      .join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': localizedServiceUrl,
    },
    hasPart: documents.map((document) => {
      const dashboardJsonLd: Record<string, unknown> = {
        '@type': 'TechArticle',
        headline: document.name,
        description: document.short_description,
        datePublished: document.created_at,
        dateModified: document.updated_at,
        author: document.uploader
          ? {
              '@type': 'Person',
              name: formatPersonNames(document.uploader),
            }
          : undefined,
        about: {
          '@type': 'Thing',
          name: 'Cybersecurity',
        },
        keywords: document.use_cases?.map((useCase) => useCase.name).join(', '),
      };
      if (document.children_documents!.length > 0) {
        dashboardJsonLd.image = document.children_documents!.map(
          (image) =>
            `${baseUrl}/document/images/${serviceInstance.id}/${image.id}`
        );
      }
      return dashboardJsonLd;
    }),
  };

  jsonLd.image = [
    serviceInstance.illustration_document_id
      ? `${baseUrl}/document/images/${serviceInstance.id}/${serviceInstance.illustration_document_id}`
      : `${baseUrl}/seo_default.png`,
  ];

  const breadcrumbValue = [
    {
      label: 'MenuLinks.Home',
      href: `/${locale}`,
    },
    {
      label: `Service.Cards.${serviceInstance.slug}.Name`,
      fallback: serviceInstance.name,
    },
  ];

  const heroSectionProps = getHeroSectionLibraryProps(serviceInstance, t);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
      />
      <BreadcrumbNav value={breadcrumbValue} />

      <HeroSectionLibrary {...heroSectionProps} />

      <RelayProvider>
        <PublicDocumentListPageLoader
          baseUrl={baseUrl}
          serviceInstance={serviceInstance}
        />
      </RelayProvider>
    </>
  );
};

export default Page;
