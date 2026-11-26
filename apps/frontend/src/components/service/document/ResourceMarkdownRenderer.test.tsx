import ResourceMarkdownRenderer from '@/components/service/document/ResourceMarkdownRenderer';
import { FiligranWebsiteUtmCampaign } from '@/utils/filigran-website-utm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const SOURCE =
  '[Datasheet](https://filigran.io/datasheet?ref=1) and [Docs](https://docs.filigran.io/)';

describe('ResourceMarkdownRenderer', () => {
  it('should tag filigran.io links and leave other hosts untouched when a filigran website utm is given', () => {
    // Given
    const filigranWebsiteUtm = {
      campaign: FiligranWebsiteUtmCampaign.RESOURCE_PAGE,
      content: 'integration',
    };

    // When
    testRender(
      <ResourceMarkdownRenderer
        source={SOURCE}
        filigranWebsiteUtm={filigranWebsiteUtm}
      />
    );

    // Then
    expect(screen.getByRole('link', { name: 'Datasheet' })).toHaveAttribute(
      'href',
      'https://filigran.io/datasheet?ref=1&utm_source=xtm_hub&utm_medium=referral&utm_campaign=resource_page&utm_content=integration'
    );
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://docs.filigran.io/'
    );
  });
});
