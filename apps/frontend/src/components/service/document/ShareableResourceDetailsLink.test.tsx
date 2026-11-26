import { ShareableResourceDetailsLink } from '@/components/service/document/ShareableResourceDetailsLink';
import { FiligranWebsiteUtmCampaign } from '@/utils/filigran-website-utm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const EXTERNAL_URL = 'https://docs.example.com/guide';
const FILIGRAN_URL = 'https://filigran.io/media/datasheet.pdf';

describe('ShareableResourceDetailsLink', () => {
  it('should render the url as an external anchor and not as a button', () => {
    // Given a documentation url
    testRender(<ShareableResourceDetailsLink url={EXTERNAL_URL} />);

    // When the link is rendered
    const link = screen.getByRole('link', { name: EXTERNAL_URL });

    // Then it is an anchor opening the page safely in a new tab, tagged for analytics
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', EXTERNAL_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute(
      'data-analytics-id',
      'resource_external_link_open'
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should not draw an icon inside the link', () => {
    // Given a documentation url
    testRender(<ShareableResourceDetailsLink url={EXTERNAL_URL} />);

    // When the link is rendered
    // Then it holds the url as plain text, with no hand-placed icon
    expect(
      screen.getByRole('link', { name: EXTERNAL_URL }).querySelector('svg')
    ).not.toBeInTheDocument();
  });

  it('should tag a filigran.io url with the utm while keeping the displayed url untouched', () => {
    // Given a filigran.io url and a filigran website utm
    testRender(
      <ShareableResourceDetailsLink
        url={FILIGRAN_URL}
        filigranWebsiteUtm={{
          campaign: FiligranWebsiteUtmCampaign.RESOURCE_PAGE,
          content: 'integration',
        }}
      />
    );

    // When the link is rendered
    const link = screen.getByRole('link', { name: FILIGRAN_URL });

    // Then the href is tagged and the displayed text is the raw url
    expect(link).toHaveAttribute(
      'href',
      `${FILIGRAN_URL}?utm_source=xtm_hub&utm_medium=referral&utm_campaign=resource_page&utm_content=integration`
    );
    expect(link).toHaveTextContent(FILIGRAN_URL);
  });

  it('should show the full url in a tooltip when the link is focused', async () => {
    // Given a documentation url
    testRender(<ShareableResourceDetailsLink url={EXTERNAL_URL} />);

    // When the link takes the keyboard focus
    screen.getByRole('link', { name: EXTERNAL_URL }).focus();

    // Then the tooltip repeats the full url
    expect(
      await screen.findByRole('tooltip', { name: EXTERNAL_URL })
    ).toBeInTheDocument();
  });
});
