import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { describe, expect, it } from 'vitest';
import { isResourceDeployable } from './shareable-resources.client.utils';

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
