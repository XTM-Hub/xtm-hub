import ShareableResourceDetails from '@/components/service/document/ShareableResouceDetails';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';

const buildDocumentData = (
  overrides: Partial<documentItem_fragment$data> = {}
): documentItem_fragment$data =>
  ({
    id: 'doc-1',
    type: ShareableResourceType.OPENCTI_INTEGRATION,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    share_number: 42,
    uploader: {
      first_name: 'john',
      last_name: 'doe',
      email: 'john.doe@filigran.io',
      picture: null,
    },
    uploader_organization: {
      id: 'org-1',
      name: 'Filigran Team',
      personal_space: false,
    },
    integration_type: IntegrationType.CsvFeed,
    solution_categories: [
      {
        id: 'cat-1',
        name: 'Threat Intelligence',
      },
    ],
    ...overrides,
  }) as unknown as documentItem_fragment$data;

const DOCUMENT_SHARE_NUMBER = 3;
const LIVE_SHARE_NUMBER = 7;

describe('ShareableResourceDetails', () => {
  it('should render solution category and OpenCTI documentation link for CSV feed', () => {
    testRender(
      <ShareableResourceDetails
        documentData={buildDocumentData()}
        downloadNumber={1450}
      />
    );

    expect(
      screen.getByText(
        'Service.ShareableResources.Details.IntegrationSolutionCategory'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Threat Intelligence')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /https:\/\/docs\.opencti\.io\/latest\/usage\/import\/csv-feed\//i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.ShareableResources.Details.Downloads')
    ).toBeInTheDocument();
    expect(screen.getByText('+1k')).toBeInTheDocument();
  });

  it('should hide downloads for third-party integrations', () => {
    testRender(
      <ShareableResourceDetails
        documentData={buildDocumentData({
          integration_type: IntegrationType.ThirdPartyIntegration,
        })}
        downloadNumber={1450}
      />
    );

    expect(
      screen.queryByText('Service.ShareableResources.Details.Downloads')
    ).not.toBeInTheDocument();
  });

  it('should render integration license type when provided', () => {
    testRender(
      <ShareableResourceDetails
        documentData={buildDocumentData({
          license_type: 'Commercial',
        })}
      />
    );

    expect(
      screen.getByText(
        'Service.ShareableResources.Details.IntegrationLicenseType'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Commercial')).toBeInTheDocument();
  });

  it('should not render integration license type when absent', () => {
    testRender(
      <ShareableResourceDetails
        documentData={buildDocumentData({
          license_type: undefined,
        })}
      />
    );

    expect(
      screen.queryByText(
        'Service.ShareableResources.Details.IntegrationLicenseType'
      )
    ).not.toBeInTheDocument();
  });

  it('should fallback to Filigran when organization is undefined', () => {
    testRender(
      <ShareableResourceDetails
        documentData={buildDocumentData({
          uploader_organization: undefined,
        })}
      />
    );

    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Filigran')).toBeInTheDocument();
  });

  it.each([
    {
      context: 'a share number is given',
      shareNumber: LIVE_SHARE_NUMBER,
      expectedShareCount: LIVE_SHARE_NUMBER,
    },
    {
      context: 'no share number is given',
      shareNumber: undefined,
      expectedShareCount: DOCUMENT_SHARE_NUMBER,
    },
  ])(
    'should display $expectedShareCount shares when $context',
    ({ shareNumber, expectedShareCount }) => {
      // Given a document shared DOCUMENT_SHARE_NUMBER times
      // When the details are rendered
      testRender(
        <ShareableResourceDetails
          documentData={buildDocumentData({
            share_number: DOCUMENT_SHARE_NUMBER,
          })}
          shareNumber={shareNumber}
        />
      );

      // Then the share count shown is the given one, else the document's
      const shareCount = screen
        .getByText('Service.ShareableResources.Details.Shares')
        .closest('div')?.lastElementChild;
      expect(shareCount).toHaveTextContent(
        new RegExp(`^${expectedShareCount}$`)
      );
    }
  );
});
