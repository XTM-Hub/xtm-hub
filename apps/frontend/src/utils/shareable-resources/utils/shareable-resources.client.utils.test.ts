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
  active: boolean;
  integrationType?: documentItem_fragment$data['integration_type'];
  typename?: string;
};

const buildDocumentData = ({
  type,
  active,
  integrationType,
  typename = 'Document',
}: Omit<DeployableCase, 'expected'>): documentItem_fragment$data =>
  ({
    __typename: typename,
    id: 'doc-1',
    type,
    active,
    integration_type: integrationType,
  }) as documentItem_fragment$data;

describe('isResourceDeployable', () => {
  it.each<DeployableCase>([
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      active: true,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_CUSTOM_VIEW,
      active: true,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENAEV_SCENARIO,
      active: true,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_PLAYBOOK,
      active: true,
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      active: false,
    },
    {
      expected: false,
      type: ShareableResourceType.OPENAEV_SCENARIO,
      active: false,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: true,
      integrationType: 'csv_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: true,
      integrationType: 'taxii_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: true,
      integrationType: 'rss_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: true,
      integrationType: 'stream',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: true,
      integrationType: 'third_party_integration',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: true,
      integrationType: 'connector',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: false,
      integrationType: 'csv_feed',
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: true,
      integrationType: 'connector',
      typename: 'Connector',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      active: false,
      integrationType: 'connector',
      typename: 'Connector',
    },
  ])(
    'should return $expected when type is $type, active is $active, integration type is $integrationType and typename is $typename',
    ({ expected, type, active, integrationType, typename }) => {
      // Given
      const document = buildDocumentData({
        type,
        active,
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
