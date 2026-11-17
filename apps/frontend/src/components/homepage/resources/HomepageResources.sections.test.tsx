import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockServerGraphqlFetch, mockGetBaseUrl, mockList } = vi.hoisted(() => ({
  mockServerGraphqlFetch: vi.fn(),
  mockGetBaseUrl: vi.fn(),
  mockList: vi.fn(() => null),
}));

vi.mock('@/lib/server-graphql-fetch', () => ({
  serverGraphqlFetch: mockServerGraphqlFetch,
}));

vi.mock('@/utils/generate-metadata', () => ({
  getBaseUrl: mockGetBaseUrl,
}));

vi.mock('@/hooks/get-translate', () => ({
  getTranslate: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/components/homepage/resources/HomepageResourceList', () => ({
  default: mockList,
}));

import MostDeployedResources from './MostDeployedResources';
import NewestResources from './NewestResources';

const BASE_URL = 'https://hub.filigran.io';

describe.each`
  name                       | Section                  | field
  ${'NewestResources'}       | ${NewestResources}       | ${'newestDocuments'}
  ${'MostDeployedResources'} | ${MostDeployedResources} | ${'mostDeployedDocuments'}
`(
  '$name',
  ({ Section, field }: { Section: typeof NewestResources; field: string }) => {
    beforeEach(() => {
      mockServerGraphqlFetch.mockReset();
      mockGetBaseUrl.mockReset();
      mockList.mockClear();
      mockGetBaseUrl.mockResolvedValue(BASE_URL);
    });

    it('passes the documents, the base url and the context to the resource list', async () => {
      const documents = [{ id: 'doc-1' }];
      mockServerGraphqlFetch.mockResolvedValue({ [field]: documents });

      const element = await Section({
        isAuthenticated: true,
        paramsLocale: 'en',
      });

      expect(element.props).toEqual(
        expect.objectContaining({
          documents,
          baseUrl: BASE_URL,
          isAuthenticated: true,
          paramsLocale: 'en',
        })
      );
    });
  }
);
