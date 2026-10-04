import { ShareableResourceConnectorDetails } from '@/components/service/document/connector/ShareableResourceConnectorDetails';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const CONTACT_LABEL = 'Service.ShareableResources.Details.ContributorContact';
const CONTACT_VALUE = 'contributor@example.com';
const CONNECTOR_NAME = 'MISP Intel';

describe('ShareableResourceConnectorDetails', () => {
  it('should display the contributor contact when the connector provides one', () => {
    // Given a connector carrying a contributor contact
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{ name: CONNECTOR_NAME, contact: CONTACT_VALUE }}
      />
    );

    // When the details panel is rendered
    // Then the contact is shown as plain text next to its label
    expect(screen.getByText(CONTACT_LABEL)).toBeInTheDocument();
    expect(screen.getByText(CONTACT_VALUE)).toBeInTheDocument();
  });

  it('should not display the contributor contact row when the connector has none', () => {
    // Given a Filigran-supported connector, which carries no contact
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{ name: CONNECTOR_NAME }}
      />
    );

    // When the details panel is rendered
    // Then no empty label is shown
    expect(screen.queryByText(CONTACT_LABEL)).not.toBeInTheDocument();
  });

  it('should display an inferred coverage with its origin', () => {
    // Given a connector whose coverage was inferred from its contract
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{
          name: CONNECTOR_NAME,
          covered_object_types: ['Indicator', 'Report'],
          covered_sectors: [],
          coverage_inferred: true,
        }}
      />
    );

    // When the details panel is rendered
    // Then the covered values and the inferred label are shown, empty families are not
    expect(
      screen.getByText('Service.ShareableResources.Details.CoveredObjectTypes')
    ).toBeInTheDocument();
    expect(screen.getByText('Indicator, Report')).toBeInTheDocument();
    expect(
      screen.queryByText('Service.ShareableResources.Details.CoveredSectors')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Service.ShareableResources.Details.CoverageInferred')
    ).toBeInTheDocument();
  });
});
