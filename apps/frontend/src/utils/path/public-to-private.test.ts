import { resolvePrivatePath } from '@/utils/path/public-to-private';
import { fetchSeoServiceInstances } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import {
  fetchSingleDocument,
  isPublicDocumentSlug,
} from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import {
  DocumentStatus,
  PublicDocumentByServiceSlugItemFragment,
  SeoServiceInstanceItemFragment,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '@/utils/seo-service-instance/utils/seo-service-instance.server.utils',
  () => ({ fetchSeoServiceInstances: vi.fn() })
);
vi.mock(
  '@/utils/shareable-resources/utils/shareable-resources.server.utils',
  () => ({ fetchSingleDocument: vi.fn(), isPublicDocumentSlug: vi.fn() })
);

const INTEGRATIONS_ID = 'integrations-id';
const ROADMAP_ID = 'roadmap-id';
const DOCUMENT_ID = 'document-id';
const KNOWN_DOC_SLUG = 'crowdstrike';

const buildService = (
  id: string,
  slug: string,
  identifier: ServiceDefinitionIdentifier
): SeoServiceInstanceItemFragment => ({
  id,
  name: slug,
  slug,
  description: null,
  logo_document_id: null,
  illustration_document_id: null,
  tags: null,
  links: null,
  service_definition: { identifier },
});

const SERVICES: SeoServiceInstanceItemFragment[] = [
  buildService(
    INTEGRATIONS_ID,
    'opencti-integrations',
    ServiceDefinitionIdentifier.OpenctiIntegrations
  ),
  buildService(
    ROADMAP_ID,
    'xtm-platform-roadmap',
    ServiceDefinitionIdentifier.XtmPlatformRoadmap
  ),
  buildService('link-id', 'external-link', ServiceDefinitionIdentifier.Link),
];

const DOCUMENT: PublicDocumentByServiceSlugItemFragment = {
  __typename: 'DefaultDocument',
  id: DOCUMENT_ID,
  children_documents: null,
  created_at: null,
  description: null,
  download_number: null,
  name: KNOWN_DOC_SLUG,
  share_number: null,
  short_description: null,
  slug: KNOWN_DOC_SLUG,
  status: DocumentStatus.Published,
  type: 'opencti_integration',
  updated_at: null,
  uploader: null,
  uploader_organization: null,
  use_cases: null,
};

const INTEGRATIONS_PATH = `/app/service/opencti_integrations/${INTEGRATIONS_ID}`;

describe('resolvePrivatePath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSeoServiceInstances).mockResolvedValue(SERVICES);
    vi.mocked(isPublicDocumentSlug).mockImplementation(
      async (_serviceSlug, docSlug) => docSlug === KNOWN_DOC_SLUG
    );
    vi.mocked(fetchSingleDocument).mockResolvedValue(DOCUMENT);
  });

  it.each([
    {
      page: 'a library',
      publicPath: '/en/cybersecurity-solutions/opencti-integrations',
      expected: INTEGRATIONS_PATH,
    },
    {
      page: 'a resource',
      publicPath: `/fr/cybersecurity-solutions/opencti-integrations/${KNOWN_DOC_SLUG}`,
      expected: `${INTEGRATIONS_PATH}/${DOCUMENT_ID}`,
    },
    {
      page: 'an unknown resource of a known library',
      publicPath: '/en/cybersecurity-solutions/opencti-integrations/unknown',
      expected: INTEGRATIONS_PATH,
    },
    {
      page: 'the roadmap',
      publicPath: '/en/cybersecurity-solutions/xtm-platform-roadmap',
      expected: `/app/service/xtm_platform_roadmap/${ROADMAP_ID}`,
    },
    {
      page: 'feature voting',
      publicPath:
        '/ja/cybersecurity-solutions/xtm-platform-roadmap/feature-voting',
      expected: `/app/service/xtm_platform_roadmap/${ROADMAP_ID}/feature-voting`,
    },
    {
      page: 'the trial',
      publicPath: '/en/cybersecurity-solutions/xtm-platform-trial',
      expected: '/app/service/xtm-platform-trial',
    },
  ])(
    'should resolve $page to its private counterpart',
    async ({ publicPath, expected }) => {
      // When
      const result = await resolvePrivatePath(publicPath);

      // Then
      expect(result).toBe(expected);
    }
  );

  it.each([
    { page: 'the homepage', publicPath: '/en' },
    { page: 'the catalog', publicPath: '/en/cybersecurity-solutions' },
    { page: 'another public page', publicPath: '/en/editable-text' },
    {
      page: 'an unknown locale',
      publicPath: '/xx/cybersecurity-solutions/opencti-integrations',
    },
    {
      page: 'an unknown service',
      publicPath: '/en/cybersecurity-solutions/unknown-service',
    },
    {
      page: 'an external service',
      publicPath: '/en/cybersecurity-solutions/external-link',
    },
    {
      page: 'a path deeper than a resource',
      publicPath: `/en/cybersecurity-solutions/opencti-integrations/${KNOWN_DOC_SLUG}/extra`,
    },
  ])('should return null for $page', async ({ publicPath }) => {
    // When
    const result = await resolvePrivatePath(publicPath);

    // Then
    expect(result).toBeNull();
  });

  it('should resolve the trial without looking up any service', async () => {
    // When
    await resolvePrivatePath('/en/cybersecurity-solutions/xtm-platform-trial');

    // Then
    expect(fetchSeoServiceInstances).not.toHaveBeenCalled();
  });

  it('should not fetch an unknown resource, which the API would reject', async () => {
    // When
    await resolvePrivatePath(
      '/en/cybersecurity-solutions/opencti-integrations/unknown'
    );

    // Then
    expect(fetchSingleDocument).not.toHaveBeenCalled();
  });

  it('should percent-encode the ids it puts in the private path', async () => {
    // Given
    // Relay global IDs are base64 and can contain `+`, `/` and `=`.
    const serviceId = 'U2VydmljZTp4/+=';
    vi.mocked(fetchSeoServiceInstances).mockResolvedValue([
      buildService(
        serviceId,
        'opencti-integrations',
        ServiceDefinitionIdentifier.OpenctiIntegrations
      ),
    ]);

    // When
    const result = await resolvePrivatePath(
      '/en/cybersecurity-solutions/opencti-integrations'
    );

    // Then
    expect(result).toBe(
      `/app/service/opencti_integrations/${encodeURIComponent(serviceId)}`
    );
  });

  it('should reject when the path holds a malformed escape sequence', async () => {
    // When
    const result = resolvePrivatePath(
      '/en/cybersecurity-solutions/opencti-integrations/%E0%A4%A'
    );

    // Then
    await expect(result).rejects.toThrow(URIError);
  });
});
