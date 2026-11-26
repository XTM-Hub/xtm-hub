import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { DocumentItemFragment, IntegrationType } from '@graphql/generated';
import { describe, expect, it } from 'vitest';
import { isResourceDeployable } from './shareable-resources.client.utils';

type DeployableCase = {
  expected: boolean;
  type: ShareableResourceType;
  status: DocumentItemFragment['status'];
  integrationType?: IntegrationType;
  typename?: string;
};

const buildDocumentData = ({
  type,
  status,
  integrationType,
  typename = 'Document',
}: Omit<DeployableCase, 'expected'>): DocumentItemFragment =>
  ({
    __typename: typename,
    id: 'doc-1',
    type,
    status,
    integration_type: integrationType,
  }) as DocumentItemFragment;

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
      integrationType: IntegrationType.CsvFeed,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: IntegrationType.TaxiiFeed,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: IntegrationType.RssFeed,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: IntegrationType.Stream,
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: IntegrationType.ThirdPartyIntegration,
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: IntegrationType.Connector,
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'draft',
      integrationType: IntegrationType.CsvFeed,
    },
    {
      expected: true,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'published',
      integrationType: IntegrationType.Connector,
      typename: 'Connector',
    },
    {
      expected: false,
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      status: 'draft',
      integrationType: IntegrationType.Connector,
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
