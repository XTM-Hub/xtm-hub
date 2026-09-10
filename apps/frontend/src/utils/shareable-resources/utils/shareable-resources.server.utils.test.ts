import { pick } from '@/lib/pick';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { mockDocument } from '@graphql/mocks';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchAllDocuments,
  fetchDocumentSlugsForSitemap,
  publicDocumentsCacheTag,
} from './shareable-resources.server.utils';

vi.mock('@/lib/server-graphql-fetch', () => ({
  serverGraphqlFetch: vi.fn(),
}));

const SERVICE_SLUG = ServiceSlug.OPEN_CTI_INTEGRATIONS;

describe('fetchAllDocuments', () => {
  it('should return the full document data for each document of the service', async () => {
    // Given a backend response with a single document
    const document = mockDocument({ slug: 'my-connector' });
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      publicDocumentsByServiceSlug: [document],
    });

    // When fetching every document of that service
    const result = await fetchAllDocuments(SERVICE_SLUG);

    // Then it returns the backend data unchanged
    expect(result).toEqual([document]);
  });

  it('should tag the request with the shared public documents cache tag', async () => {
    // Given a backend response
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      publicDocumentsByServiceSlug: [],
    });

    // When fetching every document of that service
    await fetchAllDocuments(SERVICE_SLUG);

    // Then the request is tagged with the same cache tag as
    // fetchDocumentSlugsForSitemap, so a document create/update/delete
    // invalidates both at once
    expect(serverGraphqlFetch).toHaveBeenCalledWith(
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
    await expect(fetchAllDocuments(unknownSlug)).rejects.toThrow(
      `Invalid service slug: ${unknownSlug}`
    );
    expect(serverGraphqlFetch).not.toHaveBeenCalled();
  });
});

describe('fetchDocumentSlugsForSitemap', () => {
  it('should return only slug/created_at/updated_at for each document of the service', async () => {
    // Given a backend response with a single document, trimmed to the fields
    // the sitemap query actually selects
    const document = pick(mockDocument({ slug: 'my-connector' }), [
      'slug',
      'created_at',
      'updated_at',
    ]);
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      publicDocumentsByServiceSlug: [document],
    });

    // When fetching the sitemap-only document slugs for that service
    const result = await fetchDocumentSlugsForSitemap(SERVICE_SLUG);

    // Then it returns the lightweight document data unchanged
    expect(result).toEqual([document]);
  });

  it('should tag the request with the shared public documents cache tag', async () => {
    // Given a backend response
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      publicDocumentsByServiceSlug: [],
    });

    // When fetching the sitemap-only document slugs for that service
    await fetchDocumentSlugsForSitemap(SERVICE_SLUG);

    // Then the request is tagged with the same cache tag as fetchAllDocuments,
    // so a document create/update/delete invalidates both at once
    expect(serverGraphqlFetch).toHaveBeenCalledWith(
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
    expect(serverGraphqlFetch).not.toHaveBeenCalled();
  });
});
