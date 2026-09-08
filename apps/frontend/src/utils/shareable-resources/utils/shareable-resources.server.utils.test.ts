import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchDocumentSlugsForSitemap,
  publicDocumentsCacheTag,
} from './shareable-resources.server.utils';

vi.mock('@/relay/server-portal-api-fetch', () => ({
  serverFetchGraphQL: vi.fn(),
}));

const SERVICE_SLUG = ServiceSlug.OPEN_CTI_INTEGRATIONS;
const DOCUMENT_SLUG = 'my-connector';
const CREATED_AT = '2026-01-01T00:00:00.000Z';
const UPDATED_AT = '2026-02-01T00:00:00.000Z';

describe('fetchDocumentSlugsForSitemap', () => {
  it('should return only slug/created_at/updated_at for each document of the service', async () => {
    // Given a backend response with a single document
    vi.mocked(serverFetchGraphQL).mockResolvedValue({
      data: {
        publicDocumentsByServiceSlug: [
          {
            slug: DOCUMENT_SLUG,
            created_at: CREATED_AT,
            updated_at: UPDATED_AT,
          },
        ],
      },
    });

    // When fetching the sitemap-only document slugs for that service
    const result = await fetchDocumentSlugsForSitemap(SERVICE_SLUG);

    // Then it returns the lightweight document data unchanged
    expect(result).toEqual([
      { slug: DOCUMENT_SLUG, created_at: CREATED_AT, updated_at: UPDATED_AT },
    ]);
  });

  it('should tag the request with the shared public documents cache tag', async () => {
    // Given a backend response
    vi.mocked(serverFetchGraphQL).mockResolvedValue({
      data: { publicDocumentsByServiceSlug: [] },
    });

    // When fetching the sitemap-only document slugs for that service
    await fetchDocumentSlugsForSitemap(SERVICE_SLUG);

    // Then the request is tagged with the same cache tag as fetchAllDocuments,
    // so a document create/update/delete invalidates both at once
    expect(serverFetchGraphQL).toHaveBeenCalledWith(
      expect.anything(),
      { serviceInstanceSlug: SERVICE_SLUG },
      expect.objectContaining({
        next: expect.objectContaining({
          tags: [publicDocumentsCacheTag(SERVICE_SLUG)],
        }),
      })
    );
  });

  it('should throw when given a slug that is not a known service slug', async () => {
    // Given a slug that isn't a member of ServiceSlug
    const unknownSlug = 'not-a-real-service' as ServiceSlug;

    // When/Then fetching for that slug throws instead of calling the backend
    await expect(fetchDocumentSlugsForSitemap(unknownSlug)).rejects.toThrow(
      `Invalid service slug: ${unknownSlug}`
    );
    expect(serverFetchGraphQL).not.toHaveBeenCalled();
  });
});
