import { pick } from '@/lib/pick';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { mockDocument } from '@graphql/mocks';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchAllDocuments,
  fetchPublicDocumentSlugs,
  isPublicDocumentSlug,
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
    // fetchPublicDocumentSlugs, so a document create/update/delete
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

describe('fetchPublicDocumentSlugs', () => {
  it('should return only slug/created_at/updated_at for each document of the service', async () => {
    // Given a backend response with a single document, trimmed to the fields
    // the sitemap query actually selects
    const document = pick(mockDocument({ slug: 'my-connector' }), [
      'slug',
      'created_at',
      'updated_at',
    ]);
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      publicDocumentSlugsByServiceSlug: [document],
    });

    // When fetching the sitemap-only document slugs for that service
    const result = await fetchPublicDocumentSlugs(SERVICE_SLUG);

    // Then it returns the lightweight document data unchanged
    expect(result).toEqual([document]);
  });

  it('should tag the request with the shared public documents cache tag', async () => {
    // Given a backend response
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      publicDocumentSlugsByServiceSlug: [],
    });

    // When fetching the sitemap-only document slugs for that service
    await fetchPublicDocumentSlugs(SERVICE_SLUG);

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
    await expect(fetchPublicDocumentSlugs(unknownSlug)).rejects.toThrow(
      `Invalid service slug: ${unknownSlug}`
    );
    expect(serverGraphqlFetch).not.toHaveBeenCalled();
  });
});

describe('isPublicDocumentSlug', () => {
  const KNOWN_DOC_SLUG = 'my-connector';

  it.each([
    { docSlug: KNOWN_DOC_SLUG, expected: true },
    { docSlug: 'guessed-slug', expected: false },
  ])(
    'should return $expected for the document slug "$docSlug"',
    async ({ docSlug, expected }) => {
      // Given a service whose only public document is KNOWN_DOC_SLUG
      vi.mocked(serverGraphqlFetch).mockResolvedValue({
        publicDocumentSlugsByServiceSlug: [
          pick(mockDocument({ slug: KNOWN_DOC_SLUG }), [
            'slug',
            'created_at',
            'updated_at',
          ]),
        ],
      });

      // When checking the document slug
      const result = await isPublicDocumentSlug(SERVICE_SLUG, docSlug);

      // Then only the listed slug is considered public
      expect(result).toBe(expected);
    }
  );

  it('should return false without calling the backend for a service that holds no documents', async () => {
    // Given a service slug that isn't a member of ServiceSlug
    const unknownServiceSlug = 'not-a-real-service';

    // When checking a document slug of that service
    const result = await isPublicDocumentSlug(
      unknownServiceSlug,
      KNOWN_DOC_SLUG
    );

    // Then it is rejected without fetching the slug list
    expect(result).toBe(false);
    expect(serverGraphqlFetch).not.toHaveBeenCalled();
  });
});
