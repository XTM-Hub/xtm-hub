import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { describe, expect, it } from 'vitest';
import { isResourceDeployable } from './shareable-resources.client.utils';

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
