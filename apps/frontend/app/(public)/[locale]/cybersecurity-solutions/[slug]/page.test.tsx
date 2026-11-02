import {
  fetchSeoServiceInstanceBySlug,
  isPublicServiceSlug,
} from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import Page, {
  generateMetadata,
} from '@app/(public)/[locale]/cybersecurity-solutions/[slug]/page';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const SERVICE_SLUG = 'opencti-integrations';

vi.mock(
  '@/utils/seo-service-instance/utils/seo-service-instance.server.utils',
  () => ({
    fetchSeoServiceInstanceBySlug: vi.fn(),
    fetchSeoServiceInstanceMetadata: vi.fn(),
    isPublicServiceSlug: vi.fn(),
  })
);

vi.mock('@/hooks/get-translate', () => ({
  getTranslate: vi.fn(async () => (key: string) => key),
}));

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock('@/utils/generate-metadata', () => ({
  buildSeoPageMetadata: vi.fn(),
  buildFiligranOrganizationJsonLd: vi.fn(),
  getBaseUrl: vi.fn(async () => 'https://hub.filigran.io'),
  stringifyJsonLd: vi.fn(),
}));

const params = Promise.resolve({ slug: SERVICE_SLUG, locale: 'en' as const });

describe('public service page', () => {
  beforeEach(() => {
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error(NOT_FOUND_ERROR);
    });
  });

  it.each([
    { entry: 'page', render: () => Page({ params }) },
    { entry: 'metadata', render: () => generateMetadata({ params }) },
  ])(
    'should 404 an unknown service slug without querying the backend ($entry)',
    async ({ render }) => {
      // Given a slug that isn't a public service instance
      vi.mocked(isPublicServiceSlug).mockResolvedValue(false);

      // When rendering the page
      // Then it 404s before any by-slug backend call
      await expect(render()).rejects.toThrow(NOT_FOUND_ERROR);
      expect(fetchSeoServiceInstanceBySlug).not.toHaveBeenCalled();
    }
  );

  it('should query the backend for a known service slug', async () => {
    // Given a public service slug the backend no longer returns
    vi.mocked(isPublicServiceSlug).mockResolvedValue(true);
    vi.mocked(fetchSeoServiceInstanceBySlug).mockResolvedValue(null);

    // When rendering the page
    await expect(Page({ params })).rejects.toThrow(NOT_FOUND_ERROR);

    // Then the service instance was looked up by its slug
    expect(fetchSeoServiceInstanceBySlug).toHaveBeenCalledWith(SERVICE_SLUG);
  });
});
