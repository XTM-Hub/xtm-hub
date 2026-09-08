import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import type { publicDocumentByServiceSlugItemFragment$data } from '@generated/publicDocumentByServiceSlugItemFragment.graphql';
import type { publicDocumentBySlugItemFragment$data } from '@generated/publicDocumentBySlugItemFragment.graphql';
import publicDocumentBySlugQueryGraphql from '@generated/publicDocumentBySlugQuery.graphql';
import publicDocumentsByServiceSlugQueryGraphql from '@generated/publicDocumentsByServiceSlugQuery.graphql';
import publicDocumentsByServiceSlugSitemapQueryGraphql from '@generated/publicDocumentsByServiceSlugSitemapQuery.graphql';
import type { publicDocumentSitemapItemFragment$data } from '@generated/publicDocumentSitemapItemFragment.graphql';

/**
 * Cache tag for the public document list of a service instance. Invalidated
 * via `updateTag` in `revalidate-document-slugs.actions.ts` on document
 * create/update/delete; also used by `app/sitemap.ts`.
 */
export const publicDocumentsCacheTag = (serviceInstanceSlug: string): string =>
  `public-documents:${serviceInstanceSlug}`;

/**
 * Cache tag for a single public document. Scoped by `serviceInstanceSlug`
 * because `docSlug` alone isn't unique (unique per `type` + `slug` +
 * `version` in DB), matching how the backend looks it up.
 */
export const publicDocumentCacheTag = (
  serviceInstanceSlug: string,
  docSlug: string
): string => `public-document:${serviceInstanceSlug}:${docSlug}`;

/**
 * Fetches the full detail of every public document of a service instance,
 * for the catalog listing page. Tag-invalidated on demand, with a 1h
 * fallback revalidate to catch backend-side changes (e.g. connector
 * manifest ingestion).
 */
export async function fetchAllDocuments(
  serviceInstanceSlug: ServiceSlug
): Promise<publicDocumentByServiceSlugItemFragment$data[]> {
  if (!Object.values(ServiceSlug).includes(serviceInstanceSlug)) {
    throw new Error(`Invalid service slug: ${serviceInstanceSlug}`);
  }
  const response = await serverFetchGraphQL(
    publicDocumentsByServiceSlugQueryGraphql,
    { serviceInstanceSlug },
    {
      cache: 'force-cache',
      next: {
        tags: [publicDocumentsCacheTag(serviceInstanceSlug)],
        revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
      },
    }
  );

  const safeData = response.data as Record<string, unknown>;
  return safeData[
    'publicDocumentsByServiceSlug'
  ] as publicDocumentByServiceSlugItemFragment$data[];
}

/**
 * Fetches only the `slug`/`created_at`/`updated_at` of every public document
 * of a service instance, for sitemap generation. Reuses `fetchAllDocuments`'s
 * cache tag so a document create/update/delete invalidates both at once.
 */
export async function fetchDocumentSlugsForSitemap(
  serviceInstanceSlug: ServiceSlug
): Promise<publicDocumentSitemapItemFragment$data[]> {
  if (!Object.values(ServiceSlug).includes(serviceInstanceSlug)) {
    throw new Error(`Invalid service slug: ${serviceInstanceSlug}`);
  }
  const response = await serverFetchGraphQL(
    publicDocumentsByServiceSlugSitemapQueryGraphql,
    { serviceInstanceSlug },
    {
      cache: 'force-cache',
      next: {
        tags: [publicDocumentsCacheTag(serviceInstanceSlug)],
        revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
      },
    }
  );

  const safeData = response.data as Record<string, unknown>;
  return safeData[
    'publicDocumentsByServiceSlug'
  ] as publicDocumentSitemapItemFragment$data[];
}

/** Fetches a single public document by slug; same caching as `fetchAllDocuments`. */
export async function fetchSingleDocument(
  serviceInstanceId: string,
  serviceInstanceSlug: string,
  slug: string
): Promise<publicDocumentBySlugItemFragment$data | null> {
  const response = await serverFetchGraphQL(
    publicDocumentBySlugQueryGraphql,
    { slug, serviceInstanceId },
    {
      cache: 'force-cache',
      next: {
        tags: [publicDocumentCacheTag(serviceInstanceSlug, slug)],
        revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
      },
    }
  );
  const safeData = response.data as Record<string, unknown>;
  return safeData[
    'publicDocumentBySlug'
  ] as publicDocumentBySlugItemFragment$data | null;
}
