import ShareableResourceConnectorSlugPublic from '@/components/service/document/connector/ShareableResourceConnectorSlugPublic';
import ShareableResourceDetails from '@/components/service/document/ShareableResouceDetails';
import ShareableResourceCarousel from '@/components/service/document/ui/ShareableResourceCarouselView';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import type { PublicLocale } from '@/i18n/config';
import { RelayProvider } from '@/relay/relay-provider';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import { filterDocumentImages, findDocumentLogo } from '@/utils/documents';
import { formatPersonNames } from '@/utils/format/name';
import {
  buildFiligranOrganizationJsonLd,
  buildSeoPageMetadata,
  getBaseUrl,
  stringifyJsonLd,
} from '@/utils/generate-metadata';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { localeMap } from '@/utils/shareable-resources/shareable-resources.consts';
import {
  isConnectorResource,
  ServiceSlug,
} from '@/utils/shareable-resources/shareable-resources.types';
import {
  getServiceInfo,
  isResourceDownloadable,
} from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { fetchSingleDocument } from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import { LogoFiligranIcon } from '@filigran/icon';
import { MarkdownRenderer } from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import SeoServiceInstanceQuery, {
  seoServiceInstanceQuery,
} from '@generated/seoServiceInstanceQuery.graphql';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
const FALLBACK_DESCRIPTION_KEYS: Record<ServiceSlug, string> = {
  [ServiceSlug.OPEN_CTI_INTEGRATIONS]:
    'Metadata.DocumentFallbackDescriptionIntegration',
  [ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS]:
    'Metadata.DocumentFallbackDescriptionDashboard',
  [ServiceSlug.OPEN_CTI_CUSTOM_VIEWS]:
    'Metadata.DocumentFallbackDescriptionGeneric',
  [ServiceSlug.OPEN_AEV_SCENARIOS]:
    'Metadata.DocumentFallbackDescriptionScenario',
  [ServiceSlug.OPEN_CTI_PLAYBOOKS]:
    'Metadata.DocumentFallbackDescriptionGeneric',
};

/**
 * Fetch the data for the page with caching to avoid multiple requests
 */

const getPageData = cache(async (serviceSlug: string, docSlug: string) => {
  const baseUrl = await getBaseUrl();

  const serviceResponse = await serverFetchGraphQL<seoServiceInstanceQuery>(
    SeoServiceInstanceQuery,
    { slug: serviceSlug },
    { cache: undefined, next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS } }
  );

  const serviceInstance = serviceResponse.data
    .seoServiceInstance as unknown as seoServiceInstanceFragment$data;

  if (!serviceInstance) {
    notFound();
  }

  const document = await fetchSingleDocument(
    serviceInstance.id,
    serviceInstance.slug as string,
    docSlug
  );
  if (!document) {
    notFound();
  }

  return { baseUrl, serviceInstance, document };
});

/**
 * Generate the metadata for the page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; docSlug: string; locale: PublicLocale }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const { locale } = awaitedParams;

  const { baseUrl, serviceInstance, document } = await getPageData(
    awaitedParams.slug,
    awaitedParams.docSlug
  );
  const t = await getTranslations({ locale });

  const pathname = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`;

  const fallbackDescription = t(
    FALLBACK_DESCRIPTION_KEYS[serviceInstance.slug as ServiceSlug] ??
      'Metadata.DocumentFallbackDescriptionGeneric'
  );

  const description = document.short_description || fallbackDescription;
  const serviceLabel = t(
    `Service.ServiceDefinitionIdentifier.${serviceInstance.service_definition.identifier}`
  );

  const metadata = buildSeoPageMetadata({
    baseUrl,
    locale,
    pathname,
    title: `${document.name} | ${serviceLabel} | XTM Hub`,
    description,
    type: 'article',
    imageAlt: t('Metadata.ResourcePreviewAlt', { name: document.name ?? '' }),
    imageUrl:
      document.children_documents!.length > 0
        ? `${baseUrl}/document/images/${serviceInstance.id}/${document.children_documents![0]!.id}`
        : undefined,
  });

  metadata.openGraph = {
    ...metadata.openGraph,
    type: 'article',
    publishedTime: document.created_at,
    modifiedTime: document.updated_at,
    authors: document.uploader
      ? [formatPersonNames(document.uploader)]
      : undefined,
    tags: document.use_cases?.map((useCase) => useCase.name),
  };
  metadata.twitter = { ...metadata.twitter, creator: '@FiligranHQ' };

  return metadata;
}

/**
 * The page component
 */
const Page = async ({
  params,
}: {
  params: Promise<{ slug: string; docSlug: string; locale: PublicLocale }>;
}) => {
  const awaitedParams = await params;
  const { locale } = awaitedParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  let pageData: Awaited<ReturnType<typeof getPageData>> | undefined;
  try {
    pageData = await getPageData(awaitedParams.slug, awaitedParams.docSlug);
  } catch (_error) {
    notFound();
  }

  if (!pageData) {
    notFound();
  }

  const { baseUrl, serviceInstance, document } = pageData;

  const serviceInformation = getServiceInfo(
    {
      id: serviceInstance.id,
      slug: serviceInstance.slug as ServiceSlug,
    },
    document.id
  );

  const servicePath = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}`;
  const localizedServicePath = `/${locale}${servicePath}`;
  const pageUrl = `${baseUrl}${servicePath}/${document.slug}`;

  const fallbackDescription = t(
    FALLBACK_DESCRIPTION_KEYS[serviceInstance.slug as ServiceSlug] ??
      'Metadata.DocumentFallbackDescriptionGeneric'
  );

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${document.name} | ${t(`Service.ServiceDefinitionIdentifier.${serviceInstance.service_definition.identifier}`)} | XTM Hub`,
    description: document.short_description || fallbackDescription,
    articleBody: document.description,
    author: document.uploader
      ? {
          '@type': 'Person',
          name: formatPersonNames(document.uploader),
          image: document.uploader.picture || undefined,
        }
      : undefined,
    datePublished: document.created_at,
    dateModified: document.updated_at,
    publisher: buildFiligranOrganizationJsonLd(baseUrl),
    isPartOf: {
      '@type': 'SoftwareApplication',
      name: serviceInstance.name,
      applicationCategory: 'SecurityApplication',
      url: `${baseUrl}${servicePath}`,
    },
    keywords: document.use_cases?.map((useCase) => useCase.name).join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: {
        '@type': 'DownloadAction',
      },
      userInteractionCount: document.download_number,
    },
  };
  const mainChild = document.children_documents?.[0];
  const logo = findDocumentLogo(document);
  jsonLd.image = [
    document.children_documents!.length > 0
      ? `${baseUrl}/document/images/${serviceInstance.id}/${document.children_documents![0]!.id}`
      : `${baseUrl}/seo_default.png`,
  ];
  const breadcrumbValue = [
    {
      label: 'MenuLinks.Home',
      href: `/${locale}`,
    },
    {
      label: `Service.Cards.${serviceInstance.slug}.Name`,
      href: localizedServicePath,
      fallback: serviceInstance.name,
    },
    {
      label: `Service.Documents.${document.slug}.Name`,
      fallback: `${document?.name}`,
    },
  ];

  if (isConnectorResource(document)) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
        />
        <BreadcrumbNav value={breadcrumbValue} />
        <ShareableResourceConnectorSlugPublic
          documentData={document}
          pageUrl={pageUrl}
          serviceInstance={serviceInstance}
        />
      </>
    );
  }

  const carouselImages = filterDocumentImages(document);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
      />
      <BreadcrumbNav value={breadcrumbValue} />
      <div className="flex gap-s pb-l flex-col md:flex-row">
        {logo ? (
          <div className="w-24 shrink-0 rounded overflow-hidden">
            <Image
              src={`/document/images/${serviceInstance.id}/${logo.id}`}
              alt={`${document.name} logo`}
              width={96}
              height={96}
              loading="lazy"
              className="w-full h-full object-contain rounded"
            />
          </div>
        ) : (
          <div className="w-24 p-m border border-light shrink-0">
            <LogoFiligranIcon className="size-18" />
          </div>
        )}
        <div className="flex flex-col w-full justify-center">
          <div className="flex items-start">
            <h1 className="whitespace-nowrap mb-s">{document.name}</h1>
            <div className="flex items-center gap-s ml-auto">
              {
                <RelayProvider>
                  <ShareLinkButton
                    documentId={document.id}
                    url={`${pageUrl}`}
                    tooltipText={`Service.${localeMap[serviceInstance.slug as ServiceSlug]}.Actions.Share`}
                  />
                </RelayProvider>
              }
              {isResourceDownloadable(document) && (
                <Button
                  asChild
                  className="whitespace-nowrap">
                  <Link href={serviceInformation?.link ?? ''}>
                    {t('PublicResourcePage.Download')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <div>
            <BadgeOverflowCounter
              formatLabel={false}
              badges={document?.use_cases as BadgeOverflow[]}
              className="z-[2]"
            />
          </div>
        </div>
      </div>
      {mainChild && (
        <ShareableResourceCarousel
          serviceInstance={serviceInstance}
          images={carouselImages}
        />
      )}
      <div className="flex flex-col-reverse lg:flex-row w-full mt-l gap-xl">
        <div className="flex-[3_3_0%]">
          <h3 className="py-s txt-container-title truncate text-muted-foreground">
            {t('PublicResourcePage.Overview')}
          </h3>
          <section className="rounded bg-elevation-background-layer-1">
            <h2 className="p-l">{document?.short_description}</h2>
            <MarkdownRenderer
              source={document?.description ?? ''}
              colorMode="dark"
              className="p-l !bg-elevation-background-layer-1 markdown-content"
            />
          </section>
        </div>
        {document && (
          <ShareableResourceDetails
            documentData={document}
            downloadNumber={document.download_number}
          />
        )}
      </div>
    </>
  );
};

export default Page;
