import ShareableResourceConnectorSlug from '@/components/service/document/connector/ShareableResourceConnectorSlug';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { IncrementShareNumberDocumentMutation } from '@graphql/generated';
import { mockDefaultDocument } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/service/components/ServiceContext', () => ({
  useServiceContext: () => ({
    serviceInstance: { id: 'service-instance-1', capabilities: [] },
    translationKey: 'Service.Connectors',
  }),
}));

const SERVICE_INSTANCE = {
  id: 'service-instance-1',
} as unknown as serviceInstance_fragment$data;

const buildConnector = (id: string, shareNumber: number) =>
  ({
    id,
    name: 'Connector Name',
    type: 'opencti_integration',
    share_number: shareNumber,
    manager_supported: false,
    verified: false,
    children_documents: [],
    use_cases: [],
  }) as unknown as documentItem_fragment$data;

const renderSlugElement = (documentData: documentItem_fragment$data) => (
  <ShareableResourceConnectorSlug
    breadcrumbValue={[]}
    documentData={documentData}
    serviceInstance={SERVICE_INSTANCE}
    shareUrl="https://hub.test/cybersecurity-solutions/integrations/connector"
  />
);

const getShareCount = () =>
  screen.getByText('Service.ShareableResources.Details.Shares').closest('div')
    ?.lastElementChild;

const shareLink = async (user: ReturnType<typeof testRender>['user']) =>
  user.click(
    screen.getByRole('button', { name: 'Service.ShareableResources.Share' })
  );

describe('ShareableResourceConnectorSlug - Share count refresh', () => {
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
      renderSlugElement(buildConnector('connector-1', 3))
    );

    // When the network returns 7
    rerender(renderSlugElement(buildConnector('connector-1', 7)));

    // Then
    expect(getShareCount()).toHaveTextContent(/^7$/);
  });

  it('should increment from the network share count when the link is shared after a refresh', async () => {
    // Given a cached share count of 3 refreshed to 7
    const { user, rerender } = testRender(
      renderSlugElement(buildConnector('connector-1', 3))
    );
    rerender(renderSlugElement(buildConnector('connector-1', 7)));

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
      // Given a connector shared from a cached share count of 3
      const { user, rerender } = testRender(
        renderSlugElement(buildConnector('connector-1', 3))
      );
      await shareLink(user);
      await waitFor(() => expect(getShareCount()).toHaveTextContent(/^4$/));

      // When the connector data is refreshed
      rerender(
        renderSlugElement(buildConnector('connector-1', refreshedShareNumber))
      );

      // Then
      expect(getShareCount()).toHaveTextContent(expected);
    }
  );

  it('should reset the share count when another connector is displayed', async () => {
    // Given a connector shared from a share count of 3
    const { user, rerender } = testRender(
      renderSlugElement(buildConnector('connector-1', 3))
    );
    await shareLink(user);
    await waitFor(() => expect(getShareCount()).toHaveTextContent(/^4$/));

    // When another connector with 1 share is displayed
    rerender(renderSlugElement(buildConnector('connector-2', 1)));

    // Then
    expect(getShareCount()).toHaveTextContent(/^1$/);
  });
});
