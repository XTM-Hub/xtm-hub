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

  it('should display the connector type and the hunted platform of a hunt connector', () => {
    // Given a hunt connector that hunts on Splunk
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{
          name: 'Splunk Hunt',
          connector_type: 'INTERNAL_HUNT',
          hunt_platform: 'splunk',
        }}
      />
    );

    // When the details panel is rendered
    // Then the type and the hunted platform are shown with their labels
    expect(
      screen.getByText('Service.ShareableResources.Details.ConnectorType')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.ConnectorType.INTERNAL_HUNT'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.ShareableResources.Details.HuntedPlatform')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.OpenctiIntegrations.HuntPlatform.splunk')
    ).toBeInTheDocument();
  });

  it('should not display connector type rows when the catalog does not know the type', () => {
    // Given a connector ingested before connector types were recorded
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{ name: CONNECTOR_NAME }}
      />
    );

    // Then neither the type nor the hunted platform rows are shown
    expect(
      screen.queryByText('Service.ShareableResources.Details.ConnectorType')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.ShareableResources.Details.HuntedPlatform')
    ).not.toBeInTheDocument();
  });

  it('should display the compatibility version only when the connector declares one', () => {
    // Given a connector from a manifest fragment, which declares no product version,
    // and a connector of the legacy manifest, which declares one
    const { unmount } = testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{
          name: 'Splunk Hunt',
          connector_type: 'INTERNAL_HUNT',
        }}
      />
    );

    // Then no empty compatibility row is shown for the first one
    expect(
      screen.queryByText('Service.ShareableResources.Details.ProductVersion')
    ).not.toBeInTheDocument();
    unmount();

    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{ name: CONNECTOR_NAME, product_version: '6.8.3' }}
      />
    );
    expect(
      screen.getByText('Service.ShareableResources.Details.ProductVersion')
    ).toBeInTheDocument();
    expect(screen.getByText('6.8.3')).toBeInTheDocument();
  });
});
