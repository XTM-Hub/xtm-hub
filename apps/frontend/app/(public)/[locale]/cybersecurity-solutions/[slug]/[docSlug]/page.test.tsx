import {
  buildSeoPageMetadata,
  stringifyJsonLd,
} from '@/utils/generate-metadata';
import { fetchSeoServiceInstanceBySlug } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { PublicDocumentByServiceSlugItem } from '@/utils/shareable-resources/shareable-resources.types';
import {
  fetchSingleDocument,
  isPublicDocumentSlug,
} from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import testRender from '@/utils/test/test-render';
import Page, {
  generateMetadata,
} from '@app/(public)/[locale]/cybersecurity-solutions/[slug]/[docSlug]/page';
import {
  DocumentStatus,
  SeoServiceInstanceItemFragment,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { mockSeoServiceInstance } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const SERVICE_SLUG = 'opencti-integrations';
const DOC_SLUG = 'my-connector';
const META_DESCRIPTION = 'Ingest ransomware indicators into OpenCTI';
const GENERATED_META_DESCRIPTION = `OpenCTI Integration: ${META_DESCRIPTION}.`;
const SHORT_DESCRIPTION = 'Track ransomware activity';
const FALLBACK_DESCRIPTION = 'Metadata.DocumentFallbackDescriptionIntegration';

const SERVICE_INSTANCE: SeoServiceInstanceItemFragment = {
  id: 'service-instance-1',
  name: 'OpenCTI integrations',
  slug: SERVICE_SLUG,
  description: null,
  logo_document_id: null,
  illustration_document_id: null,
  tags: null,
  service_definition: {
    identifier: ServiceDefinitionIdentifier.OpenctiIntegrations,
  },
  links: null,
};

const buildPublicDocument = (
  descriptions: Pick<
    PublicDocumentByServiceSlugItem,
    'meta_description' | 'short_description'
  >
): PublicDocumentByServiceSlugItem => ({
  __typename: 'CustomDashboard',
  id: 'document-1',
  name: 'Ransomware overview',
  description: null,
  created_at: '2026-01-15T10:00:00',
  updated_at: null,
  slug: DOC_SLUG,
  download_number: 0,
  share_number: 0,
  status: DocumentStatus.Published,
  type: 'custom_dashboard',
  product_version: null,
  children_documents: [],
  use_cases: [],
  uploader: null,
  uploader_organization: null,
  ...descriptions,
});

vi.mock(
  '@/utils/seo-service-instance/utils/seo-service-instance.server.utils',
  () => ({ fetchSeoServiceInstanceBySlug: vi.fn() })
);

vi.mock(
  '@/utils/shareable-resources/utils/shareable-resources.server.utils',
  () => ({ fetchSingleDocument: vi.fn(), isPublicDocumentSlug: vi.fn() })
);

vi.mock('@/components/service/document/ShareableResouceDetails', () => ({
  default: () => <div />,
}));

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

  it.each([
    {
      context: 'the document has a meta-description',
      descriptions: {
        meta_description: META_DESCRIPTION,
        short_description: SHORT_DESCRIPTION,
      },
      expectedDescription: GENERATED_META_DESCRIPTION,
    },
    {
      context: 'the document has no meta-description',
      descriptions: {
        meta_description: null,
        short_description: SHORT_DESCRIPTION,
      },
      expectedDescription: FALLBACK_DESCRIPTION,
    },
    {
      context: 'the meta-description of the document is empty',
      descriptions: {
        meta_description: '',
        short_description: SHORT_DESCRIPTION,
      },
      expectedDescription: FALLBACK_DESCRIPTION,
    },
    {
      context: 'the meta-description of the document is blank',
      descriptions: {
        meta_description: '   ',
        short_description: SHORT_DESCRIPTION,
      },
      expectedDescription: FALLBACK_DESCRIPTION,
    },
    {
      context: 'the document has neither a meta nor a short description',
      descriptions: { meta_description: null, short_description: null },
      expectedDescription: FALLBACK_DESCRIPTION,
    },
  ])(
    'should describe the page and its JSON-LD with $expectedDescription when $context',
    async ({ descriptions, expectedDescription }) => {
      // Given
      vi.mocked(isPublicDocumentSlug).mockResolvedValue(true);
      vi.mocked(fetchSeoServiceInstanceBySlug).mockResolvedValue(
        SERVICE_INSTANCE
      );
      vi.mocked(fetchSingleDocument).mockResolvedValue(
        buildPublicDocument(descriptions)
      );
      vi.mocked(buildSeoPageMetadata).mockReturnValue({});

      // When
      await generateMetadata({ params });
      await Page({ params });

      // Then
      expect(buildSeoPageMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ description: expectedDescription })
      );
      expect(stringifyJsonLd).toHaveBeenCalledWith(
        expect.objectContaining({ description: expectedDescription })
      );
    }
  );

  it.each([
    {
      serviceSlug: 'opencti-custom-dashboards',
      expectedDescription: `OpenCTI Dashboard: ${META_DESCRIPTION}.`,
    },
    {
      serviceSlug: 'openaev-scenarios',
      expectedDescription: `OpenAEV Scenario: ${META_DESCRIPTION}.`,
    },
  ])(
    'should describe the page and its JSON-LD with $expectedDescription when the document belongs to $serviceSlug',
    async ({ serviceSlug, expectedDescription }) => {
      // Given
      vi.mocked(isPublicDocumentSlug).mockResolvedValue(true);
      vi.mocked(fetchSeoServiceInstanceBySlug).mockResolvedValue({
        ...SERVICE_INSTANCE,
        slug: serviceSlug,
      });
      vi.mocked(fetchSingleDocument).mockResolvedValue(
        buildPublicDocument({
          meta_description: META_DESCRIPTION,
          short_description: SHORT_DESCRIPTION,
        })
      );
      vi.mocked(buildSeoPageMetadata).mockReturnValue({});

      // When
      await generateMetadata({ params });
      await Page({ params });

      // Then
      expect(buildSeoPageMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ description: expectedDescription })
      );
      expect(stringifyJsonLd).toHaveBeenCalledWith(
        expect.objectContaining({ description: expectedDescription })
      );
    }
  );

  it('should render the Overview of a regular resource on the design system Paper surface, with its title above it', async () => {
    // Given a public resource that is not a connector
    vi.mocked(isPublicDocumentSlug).mockResolvedValue(true);
    vi.mocked(fetchSeoServiceInstanceBySlug).mockResolvedValue(
      mockSeoServiceInstance({
        id: 'service-instance-1',
        slug: 'opencti-custom-dashboards',
      })
    );
    vi.mocked(fetchSingleDocument).mockResolvedValue({
      __typename: 'CustomDashboard',
      id: 'dashboard-1',
      slug: 'my-dashboard',
      name: 'My dashboard',
      short_description: 'A short description',
      description: 'Some **long** description',
      children_documents: [],
      use_cases: [],
    } as unknown as Awaited<ReturnType<typeof fetchSingleDocument>>);

    // When rendering the page
    testRender(await Page({ params }));

    // Then
    const title = screen.getByRole('heading', {
      level: 2,
      name: 'PublicResourcePage.Overview',
    });
    const surface = screen.getByText('A short description').closest('section');
    // The surface carries the design system radius, padding and overflow
    // classes. These pin the design system's class names on purpose, as jsdom
    // does no layout: a rename in the design system needs this test updated.
    expect(surface).toHaveClass('rounded-sm', 'p-4', 'overflow-x-auto');
    expect(surface).not.toContainElement(title);
    expect(surface?.parentElement).toContainElement(title);
    expect(screen.getByText('long')).toBeInTheDocument();
  });
});
