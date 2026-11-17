import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import {
  HomepageResourceDocumentFragment,
  IntegrationType,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomepageResourceList from './HomepageResourceList';

vi.mock('@/hooks/use-scroll-position', () => ({
  __esModule: true,
  default: () => ({ save: vi.fn() }),
}));

vi.mock('@/hooks/use-connector-compatibility', () => ({
  useConnectorCompatibility: () => ({
    status: 'unknown',
    compatiblePlatforms: '',
    incompatiblePlatforms: '',
    incompatibleCount: 0,
  }),
}));

const BASE_URL = 'https://hub.filigran.io';

const buildHomeDocument = (
  overrides: Record<string, unknown> = {}
): HomepageResourceDocumentFragment =>
  ({
    __typename: 'Connector',
    id: 'doc-1',
    name: 'My Connector',
    short_description: 'A connector description',
    slug: 'my-connector',
    type: ShareableResourceType.OPENCTI_INTEGRATION,
    status: 'published',
    service_instance_id: 'instance-1',
    integration_type: IntegrationType.Connector,
    product_version: '6.5.0',
    verified: true,
    manager_supported: true,
    children_documents: null,
    use_cases: [{ id: 'uc-1', name: 'Enrichment', color: '#ffffff' }],
    uploader: { first_name: 'Jane', last_name: 'Doe', picture: null },
    ...overrides,
  }) as HomepageResourceDocumentFragment;

describe('HomepageResourceList with the library card', () => {
  it('renders the home document fields through the real library card', () => {
    testRender(
      <HomepageResourceList
        title="Resources"
        baseUrl={BASE_URL}
        paramsLocale="en"
        documents={[buildHomeDocument()]}
      />
    );

    expect(screen.getByText('My Connector')).toBeInTheDocument();
    expect(screen.getByText('A connector description')).toBeInTheDocument();
    expect(screen.getByText('Enrichment')).toBeInTheDocument();
    expect(screen.getByText('V.6.5.0')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/en/cybersecurity-solutions/opencti-integrations/my-connector'
    );
    expect(
      screen.getByRole('button', { name: 'Service.ShareableResources.Share' })
    ).toBeInTheDocument();
  });

  it('renders the uploader in the footer of a non-connector document', () => {
    testRender(
      <HomepageResourceList
        title="Resources"
        baseUrl={BASE_URL}
        paramsLocale="en"
        documents={[
          buildHomeDocument({
            __typename: 'CustomDashboard',
            type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
            integration_type: undefined,
            product_version: undefined,
          }),
        ]}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
