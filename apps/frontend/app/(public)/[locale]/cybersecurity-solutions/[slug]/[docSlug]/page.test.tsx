import { fetchSeoServiceInstanceBySlug } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { isPublicDocumentSlug } from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import Page, {
  generateMetadata,
} from '@app/(public)/[locale]/cybersecurity-solutions/[slug]/[docSlug]/page';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const SERVICE_SLUG = 'opencti-integrations';
const DOC_SLUG = 'my-connector';

vi.mock(
  '@/utils/seo-service-instance/utils/seo-service-instance.server.utils',
  () => ({ fetchSeoServiceInstanceBySlug: vi.fn() })
);

vi.mock(
  '@/utils/shareable-resources/utils/shareable-resources.server.utils',
  () => ({ fetchSingleDocument: vi.fn(), isPublicDocumentSlug: vi.fn() })
);

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));

vi.mock('@/utils/generate-metadata', () => ({
  buildSeoPageMetadata: vi.fn(),
  buildFiligranOrganizationJsonLd: vi.fn(),
  getBaseUrl: vi.fn(async () => 'https://hub.filigran.io'),
  stringifyJsonLd: vi.fn(),
}));

const params = Promise.resolve({
  slug: SERVICE_SLUG,
  docSlug: DOC_SLUG,
  locale: 'en' as const,
});

describe('public document page', () => {
  beforeEach(() => {
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error(NOT_FOUND_ERROR);
    });
  });

  it.each([
    { entry: 'page', render: () => Page({ params }) },
    { entry: 'metadata', render: () => generateMetadata({ params }) },
  ])(
    'should 404 an unknown document slug without querying the backend ($entry)',
    async ({ render }) => {
      // Given a slug that isn't a public document of the service
      vi.mocked(isPublicDocumentSlug).mockResolvedValue(false);

      // When rendering the page
      // Then it 404s before any by-slug backend call
      await expect(render()).rejects.toThrow(NOT_FOUND_ERROR);
      expect(isPublicDocumentSlug).toHaveBeenCalledWith(SERVICE_SLUG, DOC_SLUG);
      expect(fetchSeoServiceInstanceBySlug).not.toHaveBeenCalled();
    }
  );

  it('should query the backend for a known document slug', async () => {
    // Given a public document slug whose service the backend no longer returns
    vi.mocked(isPublicDocumentSlug).mockResolvedValue(true);
    vi.mocked(fetchSeoServiceInstanceBySlug).mockResolvedValue(null);

    // When rendering the page
    await expect(generateMetadata({ params })).rejects.toThrow(NOT_FOUND_ERROR);

    // Then the service instance was looked up by its slug
    expect(fetchSeoServiceInstanceBySlug).toHaveBeenCalledWith(SERVICE_SLUG);
  });
});
