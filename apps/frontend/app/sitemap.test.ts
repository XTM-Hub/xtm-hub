import { ServiceDefinitionIdentifier } from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';

const sitemapMocks = vi.hoisted(() => ({
  serverFetchGraphQLMock: vi.fn(),
  fetchSeoServiceInstancesMock: vi.fn(),
  fetchDocumentSlugsForSitemapMock: vi.fn(),
}));

vi.mock('@/relay/server-portal-api-fetch', () => ({
  serverFetchGraphQL: sitemapMocks.serverFetchGraphQLMock,
}));

vi.mock(
  '@/utils/seo-service-instance/utils/seo-service-instance.server.utils',
  () => ({
    fetchSeoServiceInstances: sitemapMocks.fetchSeoServiceInstancesMock,
  })
);

vi.mock(
  '@/utils/shareable-resources/utils/shareable-resources.server.utils',
  () => ({
    fetchDocumentSlugsForSitemap: sitemapMocks.fetchDocumentSlugsForSitemapMock,
  })
);

const BASE_URL = 'https://hub.filigran.io';

describe('sitemap', () => {
  beforeEach(() => {
    sitemapMocks.serverFetchGraphQLMock.mockResolvedValue({
      data: { settings: { base_url_front: BASE_URL } },
    });
    sitemapMocks.fetchDocumentSlugsForSitemapMock.mockResolvedValue([]);
  });

  it('should exclude service instances redirecting to an external link from the sitemap', async () => {
    sitemapMocks.fetchSeoServiceInstancesMock.mockResolvedValue([
      {
        slug: 'filigran-blog',
        service_definition: {
          identifier: ServiceDefinitionIdentifier.Link,
        },
      },
    ]);

    const result = await sitemap();

    expect(
      result.some((entry) =>
        entry.url.includes('/cybersecurity-solutions/filigran-blog')
      )
    ).toBe(false);
  });

  it('should list French URLs with French alternates', async () => {
    sitemapMocks.fetchSeoServiceInstancesMock.mockResolvedValue([]);

    const result = await sitemap();

    expect(result).toContainEqual(
      expect.objectContaining({
        url: `${BASE_URL}/fr`,
        alternates: {
          languages: expect.objectContaining({ fr: `${BASE_URL}/fr` }),
        },
      })
    );
  });

  it('should keep service instances that are not external links in the sitemap', async () => {
    sitemapMocks.fetchSeoServiceInstancesMock.mockResolvedValue([
      {
        slug: 'opencti-integrations',
        service_definition: {
          identifier: ServiceDefinitionIdentifier.OpenctiIntegrations,
        },
      },
    ]);

    const result = await sitemap();

    expect(
      result.some((entry) =>
        entry.url.includes('/cybersecurity-solutions/opencti-integrations')
      )
    ).toBe(true);
  });
});
