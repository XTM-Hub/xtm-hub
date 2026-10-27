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
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Component: ShareableResourceSlug - Share count refresh', () => {
  const serviceInstance = {
    id: 'service-instance-1',
  } as unknown as serviceInstance_fragment$data;

  const buildDocument = (id: string, shareNumber: number) =>
    ({
      id,
      name: 'Test Document',
      share_number: shareNumber,
      type: 'opencti_custom_dashboard',
    }) as unknown as documentItem_fragment$data;

  const renderSlugElement = (documentData: documentItem_fragment$data) => (
    <ShareableResourceSlug
      breadcrumbValue={[]}
      documentData={documentData}
      serviceInstance={serviceInstance}
    />
  );

  const getShareCount = () =>
    screen.getByText('Service.ShareableResources.Details.Shares').closest('div')
      ?.lastElementChild;

  const shareLink = async (user: ReturnType<typeof testRender>['user']) =>
    user.click(
      screen.getByRole('button', { name: 'Service.ShareableResources.Share' })
    );

  beforeEach(() => {
    mswServer.use(
      graphql.mutation<IncrementShareNumberDocumentMutation>(
        'IncrementShareNumberDocument',
        () =>
          HttpResponse.json({
            data: {
              incrementShareNumberDocument: mockDefaultDocument(),
            },
          })
      )
    );
  });

  it('should display the network share count once it replaces the cached one', () => {
    // Given a cached share count of 3
    const { rerender } = testRender(
      renderSlugElement(buildDocument('document-1', 3)),
      { settings: mockSettings }
    );

    // When the network returns 7
    rerender(renderSlugElement(buildDocument('document-1', 7)));

    // Then
    expect(getShareCount()).toHaveTextContent(/^7$/);
  });

  it('should increment from the network share count when the link is shared after a refresh', async () => {
    // Given a cached share count of 3 refreshed to 7
    const { user, rerender } = testRender(
      renderSlugElement(buildDocument('document-1', 3)),
      { settings: mockSettings }
    );
    rerender(renderSlugElement(buildDocument('document-1', 7)));

    // When the user copies the share link
    await shareLink(user);

    // Then
    await waitFor(() => expect(getShareCount()).toHaveTextContent(/^8$/));
  });

  it.each`
    refresh                           | refreshedShareNumber | expected
    ${'predates the local share'}     | ${3}                 | ${/^4$/}
    ${'already includes the share'}   | ${4}                 | ${/^4$/}
    ${"includes other users' shares"} | ${7}                 | ${/^7$/}
  `(
    'should keep the local share when a refresh $refresh',
    async ({ refreshedShareNumber, expected }) => {
      // Given a resource shared from a cached share count of 3
      const { user, rerender } = testRender(
        renderSlugElement(buildDocument('document-1', 3)),
        { settings: mockSettings }
      );
      await shareLink(user);
      await waitFor(() => expect(getShareCount()).toHaveTextContent(/^4$/));

      // When the document data is refreshed
      rerender(
        renderSlugElement(buildDocument('document-1', refreshedShareNumber))
      );

      // Then
      expect(getShareCount()).toHaveTextContent(expected);
    }
  );

  it('should reset the share count when another document is displayed', async () => {
    // Given a resource shared from a share count of 3
    const { user, rerender } = testRender(
      renderSlugElement(buildDocument('document-1', 3)),
      { settings: mockSettings }
    );
    await shareLink(user);
    await waitFor(() => expect(getShareCount()).toHaveTextContent(/^4$/));

    // When another document with 1 share is displayed
    rerender(renderSlugElement(buildDocument('document-2', 1)));

    // Then
    expect(getShareCount()).toHaveTextContent(/^1$/);
  });
});

describe('Component: ShareableResourceSlug - Download count refresh', () => {
  const serviceInstance = {
    id: 'service-instance-1',
  } as unknown as serviceInstance_fragment$data;

  const buildDocument = (id: string, downloadNumber: number) =>
    ({
      id,
      active: false,
      description: 'description',
      download_number: downloadNumber,
      name: 'Test Document',
      type: 'opencti_custom_dashboard',
    }) as unknown as documentItem_fragment$data;

  const renderSlugElement = (documentData: documentItem_fragment$data) => (
    <ShareableResourceSlug
      breadcrumbValue={[]}
      documentData={documentData}
      serviceInstance={serviceInstance}
    />
  );

  const getDownloadCount = () =>
    screen
      .getByText('Service.ShareableResources.Details.Downloads')
      .closest('div')?.lastElementChild;

  const download = async (user: ReturnType<typeof testRender>['user']) => {
    const downloadLink = screen.getByRole('link', { name: 'Utils.Download' });
    // Keep jsdom from attempting the file navigation
    downloadLink.addEventListener('click', (event) => event.preventDefault());
    await user.click(downloadLink);
  };

  it('should display the network download count once it replaces the cached one', () => {
    // Given a cached download count of 3
    const { rerender } = testRender(
      renderSlugElement(buildDocument('document-1', 3)),
      { settings: mockSettings }
    );

    // When the network returns 7
    rerender(renderSlugElement(buildDocument('document-1', 7)));

    // Then
    expect(getDownloadCount()).toHaveTextContent(/^7$/);
  });

  it('should increment from the network download count when the resource is downloaded after a refresh', async () => {
    // Given a cached download count of 3 refreshed to 7
    const { user, rerender } = testRender(
      renderSlugElement(buildDocument('document-1', 3)),
      { settings: mockSettings }
    );
    rerender(renderSlugElement(buildDocument('document-1', 7)));

    // When the user downloads the resource
    await download(user);

    // Then
    expect(getDownloadCount()).toHaveTextContent(/^8$/);
  });

  it.each`
    refresh                              | refreshedDownloadNumber | expected
    ${'predates the local download'}     | ${3}                    | ${/^4$/}
    ${'already includes the download'}   | ${4}                    | ${/^4$/}
    ${"includes other users' downloads"} | ${7}                    | ${/^7$/}
  `(
    'should keep the local download when a refresh $refresh',
    async ({ refreshedDownloadNumber, expected }) => {
      // Given a resource downloaded from a cached download count of 3
      const { user, rerender } = testRender(
        renderSlugElement(buildDocument('document-1', 3)),
        { settings: mockSettings }
      );
      await download(user);
      expect(getDownloadCount()).toHaveTextContent(/^4$/);

      // When the document data is refreshed
      rerender(
        renderSlugElement(buildDocument('document-1', refreshedDownloadNumber))
      );

      // Then
      expect(getDownloadCount()).toHaveTextContent(expected);
    }
  );

  it('should reset the download count when another document is displayed', async () => {
    // Given a resource downloaded from a download count of 3
    const { user, rerender } = testRender(
      renderSlugElement(buildDocument('document-1', 3)),
      { settings: mockSettings }
    );
    await download(user);
    expect(getDownloadCount()).toHaveTextContent(/^4$/);

    // When another document with 1 download is displayed
    rerender(renderSlugElement(buildDocument('document-2', 1)));

    // Then
    expect(getDownloadCount()).toHaveTextContent(/^1$/);
  });
});
