import ShareableResourceSlug from '@/components/service/document/ShareableResourceSlug';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////// Mock hooks /////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
vi.mock('@/hooks/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: vi.fn(),
}));

vi.mock('../../../hooks/use-decoded-params', () => ({
  default: () => ({
    serviceInstanceId: 'test-service-id',
  }),
}));

vi.mock('./one-click-deploy/OneClickDeploy', () => ({
  default: ({
    requiredProductVersion,
  }: {
    requiredProductVersion?: string | null;
  }) => (
    <div data-required-version={requiredProductVersion ?? ''}>
      OneClickDeployComponentMock
    </div>
  ),
}));

describe('Component: ShareableResourceSlug - OneClickDeploy Logic', () => {
  const serviceInstance = {
    id: 'service-instance-1',
  } as unknown as serviceInstance_fragment$data;

  const renderSlug = (documentData: documentItem_fragment$data) =>
    testRender(
      <ShareableResourceSlug
        breadcrumbValue={[]}
        documentData={documentData}
        serviceInstance={serviceInstance}
      />,
      { settings: { base_url_front: 'https://test.com' } }
    );

  it.each`
    shouldShowOneClickComponent | documentType                  | documentActive | integrationType
    ${true}                     | ${'opencti_custom_dashboard'} | ${true}        | ${false}
    ${false}                    | ${'opencti_custom_dashboard'} | ${false}       | ${false}
    ${true}                     | ${'opencti_integration'}      | ${true}        | ${IntegrationType.CsvFeed}
    ${true}                     | ${'opencti_integration'}      | ${true}        | ${IntegrationType.TaxiiFeed}
    ${true}                     | ${'opencti_integration'}      | ${true}        | ${IntegrationType.Stream}
    ${false}                    | ${'opencti_integration'}      | ${true}        | ${IntegrationType.ThirdPartyIntegration}
    ${false}                    | ${'opencti_integration'}      | ${false}       | ${IntegrationType.CsvFeed}
    ${true}                     | ${'openaev_scenario'}         | ${true}        | ${false}
    ${false}                    | ${'openaev_scenario'}         | ${false}       | ${false}
    ${true}                     | ${'opencti_hunt_pack'}        | ${true}        | ${false}
    ${false}                    | ${'opencti_hunt_pack'}        | ${false}       | ${false}
  `(
    'should show OneClickDeploy=$shouldShowOneClickComponent when document is $documentType is $documentActive and integration type is $integrationType',
    ({
      shouldShowOneClickComponent,
      documentType,
      documentActive,
      integrationType,
    }) => {
      const testDocumentData = {
        active: documentActive,
        description: 'description',
        download_number: 1,
        name: 'Test Document',
        type: documentType,
        integration_type: integrationType,
      } as unknown as documentItem_fragment$data;

      renderSlug(testDocumentData);

      const oneClickDeploy = screen.queryByText('OneClickDeployComponentMock');

      if (shouldShowOneClickComponent) {
        expect(oneClickDeploy).toBeInTheDocument();
      } else {
        expect(oneClickDeploy).not.toBeInTheDocument();
      }
    }
  );

  it.each`
    typename             | documentType                  | expectedVersion
    ${'OpenCTIHuntPack'} | ${'opencti_hunt_pack'}        | ${'7.261003.0'}
    ${'CustomDashboard'} | ${'opencti_custom_dashboard'} | ${''}
  `(
    'should require OpenCTI $expectedVersion to deploy a $typename',
    ({ typename, documentType, expectedVersion }) => {
      const testDocumentData = {
        __typename: typename,
        active: true,
        description: 'description',
        download_number: 1,
        name: 'Test Document',
        type: documentType,
        product_version: '7.261003.0',
        hunt_count: 1,
        attack_techniques: [],
        hunt_platforms: [],
      } as unknown as documentItem_fragment$data;

      renderSlug(testDocumentData);

      expect(screen.getByText('OneClickDeployComponentMock')).toHaveAttribute(
        'data-required-version',
        expectedVersion
      );
    }
  );
});
