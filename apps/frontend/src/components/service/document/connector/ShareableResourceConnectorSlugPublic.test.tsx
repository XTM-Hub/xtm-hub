import ShareableResourceConnectorSlugPublic from '@/components/service/document/connector/ShareableResourceConnectorSlugPublic';
import {
  ConnectorFields,
  PublicDocumentDetailsData,
  ServiceSlug,
} from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

const SUPPORTED_BY_FILIGRAN =
  'Service.ShareableResources.Details.SupportedByFiligran';
const SUPPORTED_BY_COMMUNITY =
  'Service.ShareableResources.Details.SupportedByCommunity';

const buildConnector = (
  overrides: Partial<ConnectorFields> = {}
): PublicDocumentDetailsData & ConnectorFields =>
  ({
    __typename: 'Connector',
    id: 'connector-1',
    name: 'Connector Name',
    active: true,
    verified: false,
    manager_supported: false,
    children_documents: [],
    use_cases: [],
    ...overrides,
  }) as unknown as PublicDocumentDetailsData & ConnectorFields;

const SERVICE_INSTANCE = {
  id: 'service-instance-1',
  slug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
} as unknown as seoServiceInstanceFragment$data;

const renderConnector = async (
  documentData: ReturnType<typeof buildConnector>
) =>
  testRender(
    await ShareableResourceConnectorSlugPublic({
      documentData,
      serviceInstance: SERVICE_INSTANCE,
      pageUrl:
        'https://hub.test/cybersecurity-solutions/integrations/connector',
    })
  );

describe('ShareableResourceConnectorSlugPublic', () => {
  it.each([
    { support: 'Filigran', verified: true, label: SUPPORTED_BY_FILIGRAN },
    {
      support: 'the community',
      verified: false,
      label: SUPPORTED_BY_COMMUNITY,
    },
  ])(
    'should show the connector as supported by $support when verified is $verified',
    async ({ verified, label }) => {
      // Given
      const documentData = buildConnector({ verified });

      // When
      await renderConnector(documentData);

      // Then
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );
});
