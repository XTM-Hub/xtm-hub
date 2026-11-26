import { ShareableResourceConnectorDetails } from '@/components/service/document/connector/ShareableResourceConnectorDetails';
import { FiligranWebsiteUtmCampaign } from '@/utils/filigran-website-utm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const CONTACT_LABEL = 'Service.ShareableResources.Details.ContributorContact';
const CONTACT_VALUE = 'contributor@example.com';
const CONNECTOR_NAME = 'MISP Intel';
const FILIGRAN_DATASHEET_URL = 'https://filigran.io/media/datasheet.pdf';
const SOURCE_CODE_URL = 'https://github.com/example/connector';
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

  it.each([
    {
      case: 'source code',
      name: CONNECTOR_NAME,
      href: SOURCE_CODE_URL,
      analyticsId: 'resource_source_code_open',
    },
    {
      case: 'vendor',
      name: 'Service.Connectors.VendorContact',
      href: VENDOR_URL,
      analyticsId: 'resource_vendor_open',
    },
  ])(
    'should render the $case link as an external anchor and not as a button',
    ({ name, href, analyticsId }) => {
      // Given a connector with a source code link and a vendor link
      testRender(
        <ShareableResourceConnectorDetails
          connectorDetails={{
            name: CONNECTOR_NAME,
            source_code: SOURCE_CODE_URL,
            subscription_link: VENDOR_URL,
          }}
        />
      );

      // When the details panel is rendered
      const link = screen.getByRole('link', { name });

      // Then it is an anchor opening the external page safely in a new tab, tagged for analytics
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('data-analytics-id', analyticsId);
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  );

  it('should not draw an icon inside the source code and vendor links', () => {
    // Given a connector with a source code link and a vendor link
    testRender(
      <ShareableResourceConnectorDetails
        connectorDetails={{
          name: CONNECTOR_NAME,
          source_code: SOURCE_CODE_URL,
          subscription_link: VENDOR_URL,
        }}
      />
    );

    // When the details panel is rendered
    // Then the links are plain text, with no hand-placed icon
    [CONNECTOR_NAME, 'Service.Connectors.VendorContact'].forEach((name) => {
      expect(
        screen.getByRole('link', { name }).querySelector('svg')
      ).not.toBeInTheDocument();
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
