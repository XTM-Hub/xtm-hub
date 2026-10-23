import ShareableResourceSlug from '@/components/service/document/ShareableResourceSlug';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { settingsContext_fragment$data } from '@generated/settingsContext_fragment.graphql';
import {
  IncrementShareNumberDocumentMutation,
  IntegrationType,
} from '@graphql/generated';
import { mockDefaultDocument } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
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
  default: () => <div>OneClickDeployComponentMock</div>,
}));

const mockSettings: Partial<settingsContext_fragment$data> = {
  base_url_front: 'https://test.com',
};

describe('Component: ShareableResourceSlug - OneClickDeploy Logic', () => {
  const serviceInstance = {
    id: 'service-instance-1',
  } as unknown as serviceInstance_fragment$data;

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

      testRender(
        <ShareableResourceSlug
          breadcrumbValue={[]}
          documentData={testDocumentData}
          serviceInstance={serviceInstance}
        />,
        { settings: mockSettings }
      );

      const oneClickDeploy = screen.queryByText('OneClickDeployComponentMock');

      if (shouldShowOneClickComponent) {
        expect(oneClickDeploy).toBeInTheDocument();
      } else {
        expect(oneClickDeploy).not.toBeInTheDocument();
      }
    }
  );
});

describe('Component: ShareableResourceSlug - Download', () => {
  const serviceInstance = {
    id: 'service-instance-1',
  } as unknown as serviceInstance_fragment$data;

  const renderSlug = (documentType: string, documentActive: boolean) =>
    testRender(
      <ShareableResourceSlug
        breadcrumbValue={[]}
        documentData={
          {
            id: 'document-1',
            active: documentActive,
            description: 'description',
            download_number: 1,
            name: 'Test Document',
            type: documentType,
          } as unknown as documentItem_fragment$data
        }
        serviceInstance={serviceInstance}
      />,
      { settings: mockSettings }
    );

  it.each`
    deployable | documentType                  | documentActive | accessibleName
    ${false}   | ${'opencti_custom_dashboard'} | ${false}       | ${'Utils.Download'}
    ${true}    | ${'opencti_custom_dashboard'} | ${true}        | ${'Service.ShareableResources.Download'}
  `(
    'should render the download action as a link to the document file when the resource deployable=$deployable',
    ({ documentType, documentActive, accessibleName }) => {
      // Given a downloadable resource
      // When the resource page is rendered
      renderSlug(documentType, documentActive);

      // Then the download action is a plain link to the backend file route
      expect(
        screen.getByRole('link', { name: accessibleName })
      ).toHaveAttribute(
        'href',
        '/document/get/test-service-id/document-1?attach=1'
      );
    }
  );

  it.each`
    deployable | documentType                  | documentActive | accessibleName
    ${false}   | ${'opencti_custom_dashboard'} | ${false}       | ${'Utils.Download'}
    ${true}    | ${'opencti_custom_dashboard'} | ${true}        | ${'Service.ShareableResources.Download'}
  `(
    'should increment the download count by one when the download link is clicked and the resource deployable=$deployable',
    async ({ documentType, documentActive, accessibleName }) => {
      // Given a downloadable resource downloaded once
      renderSlug(documentType, documentActive);
      const downloadLink = screen.getByRole('link', { name: accessibleName });
      // Keep jsdom from attempting the file navigation
      downloadLink.addEventListener('click', (event) => event.preventDefault());

      // When the user clicks the download link
      await userEvent.click(downloadLink);

      // Then the displayed download count goes from 1 to 2
      const downloadCount = screen
        .getByText('Service.ShareableResources.Details.Downloads')
        .closest('div')?.lastElementChild;
      expect(downloadCount).toHaveTextContent(/^2$/);
    }
  );
});

describe('Component: ShareableResourceSlug - Share', () => {
  it('should increment the share count by one once the share link is copied', async () => {
    // Given a resource shared once
    mswServer.use(
      graphql.mutation<IncrementShareNumberDocumentMutation>(
        'IncrementShareNumberDocument',
        () =>
          HttpResponse.json({
            data: {
              incrementShareNumberDocument: mockDefaultDocument({
                share_number: 2,
              }),
            },
          })
      )
    );
    const { user } = testRender(
      <ShareableResourceSlug
        breadcrumbValue={[]}
        documentData={
          {
            id: 'document-1',
            name: 'Test Document',
            share_number: 1,
            type: 'opencti_custom_dashboard',
          } as unknown as documentItem_fragment$data
        }
        serviceInstance={
          {
            id: 'service-instance-1',
          } as unknown as serviceInstance_fragment$data
        }
      />,
      { settings: mockSettings }
    );

    // When the user copies the share link
    await user.click(
      screen.getByRole('button', { name: 'Service.ShareableResources.Share' })
    );

    // Then the displayed share count goes from 1 to 2
    const shareCount = screen
      .getByText('Service.ShareableResources.Details.Shares')
      .closest('div')?.lastElementChild;
    await waitFor(() => expect(shareCount).toHaveTextContent(/^2$/));
  });
});
