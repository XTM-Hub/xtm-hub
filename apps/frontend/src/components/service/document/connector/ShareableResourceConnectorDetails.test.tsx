import { ShareableResourceConnectorDetails } from '@/components/service/document/connector/ShareableResourceConnectorDetails';
import { FiligranWebsiteUtmCampaign } from '@/utils/filigran-website-utm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const CONTACT_LABEL = 'Service.ShareableResources.Details.ContributorContact';
const CONTACT_VALUE = 'contributor@example.com';
const CONNECTOR_NAME = 'MISP Intel';
const FILIGRAN_DATASHEET_URL = 'https://filigran.io/media/datasheet.pdf';
const VENDOR_URL = 'https://vendor.example.com/contact';
const RESOURCE_PAGE_UTM = {
  campaign: FiligranWebsiteUtmCampaign.RESOURCE_PAGE,
  content: 'integration',
};

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

  it('should hide the decorative icons of the source code and vendor links from assistive technology', () => {
    // Given a connector with a source code link and a vendor link
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{
          name: CONNECTOR_NAME,
          source_code: 'https://github.com/example/connector',
          subscription_link: VENDOR_URL,
        }}
      />
    );

    // When the details panel is rendered
    // Then the icon next to each link text is hidden, the link keeps its text as name
    [CONNECTOR_NAME, 'Service.Connectors.VendorContact'].forEach((name) => {
      const icon = screen.getByRole('link', { name }).querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should tag the filigran.io links of the panel when a filigran website utm is given', () => {
    // Given a connector whose datasheet is hosted on filigran.io and whose vendor link is not
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{
          name: CONNECTOR_NAME,
          datasheet_url: FILIGRAN_DATASHEET_URL,
          subscription_link: VENDOR_URL,
        }}
        filigranWebsiteUtm={RESOURCE_PAGE_UTM}
      />
    );

    // When the details panel is rendered
    const datasheetLink = screen.getByRole('link', {
      name: FILIGRAN_DATASHEET_URL,
    });

    // Then only the filigran.io link is tagged, and its displayed url stays untouched
    expect(datasheetLink).toHaveAttribute(
      'href',
      `${FILIGRAN_DATASHEET_URL}?utm_source=xtm_hub&utm_medium=referral&utm_campaign=resource_page&utm_content=integration`
    );
    expect(
      screen.getByRole('link', { name: 'Service.Connectors.VendorContact' })
    ).toHaveAttribute('href', VENDOR_URL);
  });
});
