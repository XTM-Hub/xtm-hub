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

  it('should render the declared coverage of an integration', () => {
    testRender(
      <ShareableResourceDetails
        documentData={buildDocumentData({
          covered_object_types: ['Indicator', 'Malware'],
          covered_sectors: ['Finance'],
          covered_regions: [],
          coverage_inferred: false,
        })}
      />
    );

    expect(
      screen.getByText('Service.ShareableResources.Details.CoveredObjectTypes')
    ).toBeInTheDocument();
    expect(screen.getByText('Indicator, Malware')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(
      screen.queryByText('Service.ShareableResources.Details.CoveredRegions')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.ShareableResources.Details.CoverageInferred')
    ).not.toBeInTheDocument();
  });

  it('should flag an inferred coverage', () => {
    testRender(
      <ShareableResourceDetails
        documentData={buildDocumentData({
          covered_object_types: ['Vulnerability'],
          covered_sectors: [],
          covered_regions: [],
          coverage_inferred: true,
        })}
      />
    );

    expect(screen.getByText('Vulnerability')).toBeInTheDocument();
    expect(
      screen.getByText('Service.ShareableResources.Details.CoverageInferred')
    ).toBeInTheDocument();
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
});
