import type { PublicLocale } from '@/i18n/config';
import { toGraphqlLocale } from '@/i18n/graphql-locale';
import { GraphqlRequestError } from '@/lib/graphql-fetch.utils';
import {
  serverGraphqlFetch,
  ServerGraphqlFetchOptions,
} from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import {
  SeoServiceInstanceBySlugDocument,
  SeoServiceInstanceBySlugQuery,
  SeoServiceInstanceBySlugQueryVariables,
  SeoServiceInstanceItemFragment,
  SeoServiceInstanceMetadataItemFragment,
  SeoServiceInstancesDocument,
  SeoServiceInstancesQuery,
  ServiceInstanceLinksByTagsDocument,
  ServiceInstanceLinksByTagsQuery,
  ServiceInstanceLinksByTagsQueryVariables,
  ServiceInstanceSeoMetadataByIdDocument,
  ServiceInstanceSeoMetadataByIdQuery,
  ServiceInstanceSeoMetadataByIdQueryVariables,
  ServiceInstanceTag,
} from '@graphql/generated';

const NOT_FOUND_ERROR_CODE = 'NOT_FOUND';

const PUBLIC_PAGE_CACHE: ServerGraphqlFetchOptions = {
  cache: 'force-cache',
  next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS },
};

export async function fetchSeoServiceInstances(): Promise<
  SeoServiceInstanceItemFragment[]
> {
  const data = await serverGraphqlFetch<SeoServiceInstancesQuery>(
    SeoServiceInstancesDocument,
    {},
    PUBLIC_PAGE_CACHE
  );

  return data.seoServiceInstances;
}

export async function fetchVisibleServiceSlugs(): Promise<string[]> {
  const services = await fetchSeoServiceInstances();

  return services.flatMap((service) => (service.slug ? [service.slug] : []));
}

/**
 * Whether `slug` is a public service instance, checked against the cached
 * `seoServiceInstances` list so a guessed slug 404s on the frontend instead of
 * erroring on the backend.
 */
export async function isPublicServiceSlug(slug: string): Promise<boolean> {
  const slugs = await fetchVisibleServiceSlugs();
  return slugs.includes(slug);
}

/**
 * Returns null for an unknown slug, which the API reports as a `NOT_FOUND`
 * error code rather than a null field.
 */
export async function fetchSeoServiceInstanceBySlug(
  slug: string
): Promise<SeoServiceInstanceItemFragment | null> {
  try {
    const data = await serverGraphqlFetch<
      SeoServiceInstanceBySlugQuery,
      SeoServiceInstanceBySlugQueryVariables
    >(SeoServiceInstanceBySlugDocument, { slug }, PUBLIC_PAGE_CACHE);

    return data.seoServiceInstance;
  } catch (error: unknown) {
    if (
      error instanceof GraphqlRequestError &&
      error.code === NOT_FOUND_ERROR_CODE
    ) {
      return null;
    }
    throw error;
  }
}

export async function fetchServiceInstanceLinksByTags(
  tags: ServiceInstanceTag[]
): Promise<SeoServiceInstanceItemFragment[]> {
  const data = await serverGraphqlFetch<
    ServiceInstanceLinksByTagsQuery,
    ServiceInstanceLinksByTagsQueryVariables
  >(ServiceInstanceLinksByTagsDocument, { tags }, PUBLIC_PAGE_CACHE);

  return data.serviceInstanceLinksByTags;
}

/**
 * Fetches every language of the SEO metadata at once, so the cached response
 * is shared by all the locales of the page.
 */
export async function fetchSeoServiceInstanceMetadata(
  serviceInstanceId: string,
  locale: PublicLocale
): Promise<SeoServiceInstanceMetadataItemFragment | undefined> {
  const data = await serverGraphqlFetch<
    ServiceInstanceSeoMetadataByIdQuery,
    ServiceInstanceSeoMetadataByIdQueryVariables
  >(
    ServiceInstanceSeoMetadataByIdDocument,
    { service_instance_id: serviceInstanceId },
    PUBLIC_PAGE_CACHE
  );

  const language = toGraphqlLocale(locale);
  return data.seoServiceInstanceMetadata.find(
    (metadata) => metadata.language === language
  );
}
