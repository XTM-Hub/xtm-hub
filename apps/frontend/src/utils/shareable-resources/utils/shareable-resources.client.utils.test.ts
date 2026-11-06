import {
  ServiceSlug,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { describe, expect, it } from 'vitest';
import {
  getServiceInfo,
  isResourceDeployable,
} from './shareable-resources.client.utils';

type DeployableCase = {
  expected: boolean;
  type: ShareableResourceType;
  status: documentItem_fragment$data['status'];
  integrationType?: documentItem_fragment$data['integration_type'];
  typename?: string;
};

const buildDocumentData = ({
  type,
  status,
  integrationType,
  typename = 'Document',
}: Omit<DeployableCase, 'expected'>): documentItem_fragment$data =>
  ({
    __typename: typename,
    id: 'doc-1',
    type,
    status,
    integration_type: integrationType,
  }) as documentItem_fragment$data;

describe('isResourceDeployable', () => {
  it.each<DeployableCase>([
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      status: 'published',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_CUSTOM_VIEW,
      status: 'published',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENAEV_SCENARIO,
      status: 'published',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_PLAYBOOK,
      status: 'published',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      status: 'draft',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      status: 'in_validation',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENAEV_SCENARIO,
      status: 'draft',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: 'csv_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: 'taxii_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: 'rss_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: 'stream',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: 'third_party_integration',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: 'connector',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'draft',
      integrationType: 'csv_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: 'connector',
      typename: 'Connector',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'draft',
      integrationType: 'connector',
      typename: 'Connector',
    },
  ])(
    'should return $expected when type is $type, status is $status, integration type is $integrationType and typename is $typename',
    ({ expected, type, status, integrationType, typename }) => {
      // Given
      const document = buildDocumentData({
        type,
        status,
        integrationType,
        typename,
      });

      // When
      const result = isResourceDeployable(document);

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('getServiceInfo', () => {
  it('returns undefined when the service slug has no known config', () => {
    const result = getServiceInfo(
      { id: 'service-1', slug: 'unknown-slug' as ServiceSlug },
      'doc-1'
    );

    expect(result).toBeUndefined();
  });

  it('percent-encodes the service instance and document ids in the redirect link', () => {
    // Relay global IDs are base64 and can contain `+`, `/` and `=`; an
    // unescaped `+` in a query value would be read back as a space.
    const serviceInstanceId = 'U2VydmljZUluc3RhbmNlOnh4eHg/+/+PT0=';
    const documentId = 'RG9jdW1lbnQ6eHh4eD8rLytQVDA=';

    const result = getServiceInfo(
      { id: serviceInstanceId, slug: ServiceSlug.OPEN_CTI_INTEGRATIONS },
      documentId
    );

    const expectedLink = `/redirect/opencti_integrations?service_instance_id=${encodeURIComponent(serviceInstanceId)}&document_id=${encodeURIComponent(documentId)}`;
    expect(result?.link).toBe(expectedLink);

    // The encoded ids must round-trip unchanged through a query string parser.
    const query = result!.link.split('?')[1];
    const params = new URLSearchParams(query);
    expect(params.get('service_instance_id')).toBe(serviceInstanceId);
    expect(params.get('document_id')).toBe(documentId);
  });
});
