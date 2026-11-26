import type { PublicLocale } from '@/i18n/config';
import { GraphqlRequestError } from '@/lib/graphql-fetch.utils';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import {
  Locale,
  SeoServiceInstanceBySlugDocument,
  SeoServiceInstancesDocument,
  ServiceInstanceLinksByTagsDocument,
  ServiceInstanceSeoMetadataByIdDocument,
  ServiceInstanceTag,
} from '@graphql/generated';
import {
  mockSeoServiceInstance,
  mockSeoServiceInstanceMetadata,
} from '@graphql/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSeoServiceInstanceBySlug,
  fetchSeoServiceInstanceMetadata,
  fetchSeoServiceInstances,
  fetchServiceInstanceLinksByTags,
  fetchVisibleServiceSlugs,
  isPublicServiceSlug,
} from './seo-service-instance.server.utils';

vi.mock('@/lib/server-graphql-fetch', () => ({
  serverGraphqlFetch: vi.fn(),
}));

const SERVICE_INSTANCE_ID = 'service-instance-1';
const SERVICE_SLUG = 'my-service';
const PUBLIC_PAGE_CACHE = {
  cache: 'force-cache',
  next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchSeoServiceInstanceBySlug', () => {
  it('should return the service instance of the slug with the public page cache', async () => {
    // Given
    const serviceInstance = mockSeoServiceInstance({ slug: SERVICE_SLUG });
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      seoServiceInstance: serviceInstance,
    });

    // When
    const result = await fetchSeoServiceInstanceBySlug(SERVICE_SLUG);

    // Then
    expect(result).toEqual(serviceInstance);
    expect(serverGraphqlFetch).toHaveBeenCalledWith(
      SeoServiceInstanceBySlugDocument,
      { slug: SERVICE_SLUG },
      PUBLIC_PAGE_CACHE
    );
  });

  it('should return null when the API reports the slug as not found', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockRejectedValue(
      new GraphqlRequestError('Service not found', 'NOT_FOUND')
    );

    // When
    const result = await fetchSeoServiceInstanceBySlug('unknown-service');

    // Then
    expect(result).toBeNull();
  });

  it('should rethrow any other API error', async () => {
    // Given
    const apiError = new GraphqlRequestError(
      'SERVICE_NOT_FOUND',
      'INTERNAL_SERVER_ERROR'
    );
    vi.mocked(serverGraphqlFetch).mockRejectedValue(apiError);

    // When
    const result = fetchSeoServiceInstanceBySlug(SERVICE_SLUG);

    // Then
    await expect(result).rejects.toBe(apiError);
  });
});

describe('fetchSeoServiceInstances', () => {
  it('should return every SEO service instance with the public page cache', async () => {
    // Given
    const serviceInstances = [
      mockSeoServiceInstance({ slug: 'first' }),
      mockSeoServiceInstance({ slug: 'second' }),
    ];
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      seoServiceInstances: serviceInstances,
    });

    // When
    const result = await fetchSeoServiceInstances();

    // Then
    expect(result).toEqual(serviceInstances);
    expect(serverGraphqlFetch).toHaveBeenCalledWith(
      SeoServiceInstancesDocument,
      {},
      PUBLIC_PAGE_CACHE
    );
  });
});

describe('fetchServiceInstanceLinksByTags', () => {
  it('should return the service instances of the tags with the public page cache', async () => {
    // Given
    const tags = [ServiceInstanceTag.Trial, ServiceInstanceTag.OpenCti];
    const serviceInstances = [mockSeoServiceInstance({ tags })];
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      serviceInstanceLinksByTags: serviceInstances,
    });

    // When
    const result = await fetchServiceInstanceLinksByTags(tags);

    // Then
    expect(result).toEqual(serviceInstances);
    expect(serverGraphqlFetch).toHaveBeenCalledWith(
      ServiceInstanceLinksByTagsDocument,
      { tags },
      PUBLIC_PAGE_CACHE
    );
  });
});

describe('fetchVisibleServiceSlugs', () => {
  it('should return the slug of every service instance that has one', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      seoServiceInstances: [
        mockSeoServiceInstance({ slug: 'first' }),
        mockSeoServiceInstance({ slug: null }),
        mockSeoServiceInstance({ slug: 'second' }),
      ],
    });

    // When
    const result = await fetchVisibleServiceSlugs();

    // Then
    expect(result).toEqual(['first', 'second']);
  });
});

describe('fetchSeoServiceInstanceMetadata', () => {
  it.each<[PublicLocale, Locale]>([
    ['en', Locale.En],
    ['fr', Locale.Fr],
    ['ja', Locale.Ja],
  ])(
    'should fetch every language and return the %s metadata',
    async (locale, language) => {
      // Given
      const localeMetadata = mockSeoServiceInstanceMetadata({ language });
      vi.mocked(serverGraphqlFetch).mockResolvedValue({
        seoServiceInstanceMetadata: Object.values(Locale).map(
          (otherLanguage) =>
            otherLanguage === language
              ? localeMetadata
              : mockSeoServiceInstanceMetadata({ language: otherLanguage })
        ),
      });

      // When
      const result = await fetchSeoServiceInstanceMetadata(
        SERVICE_INSTANCE_ID,
        locale
      );

      // Then
      expect(result).toBe(localeMetadata);
      expect(serverGraphqlFetch).toHaveBeenCalledWith(
        ServiceInstanceSeoMetadataByIdDocument,
        { service_instance_id: SERVICE_INSTANCE_ID },
        PUBLIC_PAGE_CACHE
      );
    }
  );

  it('should return undefined when the locale has no metadata', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockResolvedValue({
      seoServiceInstanceMetadata: [
        mockSeoServiceInstanceMetadata({ language: Locale.En }),
      ],
    });

    // When
    const result = await fetchSeoServiceInstanceMetadata(
      SERVICE_INSTANCE_ID,
      'ja'
    );

    // Then
    expect(result).toBeUndefined();
  });
});

describe('isPublicServiceSlug', () => {
  it.each([
    { slug: SERVICE_SLUG, expected: true },
    { slug: 'guessed-service', expected: false },
  ])(
    'should return $expected for the service slug "$slug"',
    async ({ slug, expected }) => {
      // Given the API lists a single public service, plus one without slug
      vi.mocked(serverGraphqlFetch).mockResolvedValue({
        seoServiceInstances: [
          mockSeoServiceInstance({ slug: SERVICE_SLUG }),
          mockSeoServiceInstance({ slug: null }),
        ],
      });

      // When checking the service slug
      const result = await isPublicServiceSlug(slug);

      // Then only the listed slug is considered public
      expect(result).toBe(expected);
    }
  );
});
