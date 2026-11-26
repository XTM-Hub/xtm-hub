import {
  FiligranWebsiteUtmCampaign,
  getResourcePageFiligranWebsiteUtm,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const UTM_PREFIX = 'utm_source=xtm_hub&utm_medium=referral';

describe('withFiligranWebsiteUtm', () => {
  it.each`
    href                                               | campaign                                    | content               | expected
    ${'https://filigran.io/blog'}                      | ${FiligranWebsiteUtmCampaign.SIDEBAR}       | ${'blog'}             | ${`https://filigran.io/blog?${UTM_PREFIX}&utm_campaign=sidebar&utm_content=blog`}
    ${'https://filigran.io/products/xtm-one'}          | ${FiligranWebsiteUtmCampaign.SIDEBAR}       | ${'xtm_one_about'}    | ${`https://filigran.io/products/xtm-one?${UTM_PREFIX}&utm_campaign=sidebar&utm_content=xtm_one_about`}
    ${'https://filigran.io/mssa'}                      | ${FiligranWebsiteUtmCampaign.FOOTER}        | ${'terms_of_service'} | ${`https://filigran.io/mssa?${UTM_PREFIX}&utm_campaign=footer&utm_content=terms_of_service`}
    ${'https://filigran.io/thread?form_origin=xtmhub'} | ${FiligranWebsiteUtmCampaign.HOME_BANNER}   | ${'thread'}           | ${`https://filigran.io/thread?form_origin=xtmhub&${UTM_PREFIX}&utm_campaign=home_banner&utm_content=thread`}
    ${'https://filigran.io'}                           | ${FiligranWebsiteUtmCampaign.FOOTER}        | ${'copyright'}        | ${`https://filigran.io/?${UTM_PREFIX}&utm_campaign=footer&utm_content=copyright`}
    ${'https://www.filigran.io/page#section'}          | ${FiligranWebsiteUtmCampaign.RESOURCE_PAGE} | ${'integration'}      | ${`https://www.filigran.io/page?${UTM_PREFIX}&utm_campaign=resource_page&utm_content=integration#section`}
  `(
    'should tag $href with $campaign / $content',
    ({ href, campaign, content, expected }) => {
      expect(withFiligranWebsiteUtm(href, { campaign, content })).toBe(
        expected
      );
    }
  );

  it.each`
    href                                      | description
    ${'https://hub.filigran.io/app'}          | ${'the hub'}
    ${'https://docs.hub.filigran.io/latest/'} | ${'the documentation'}
    ${'https://academy.filigran.io/'}         | ${'the academy'}
    ${'https://filigran-community.slack.com'} | ${'slack'}
    ${'https://notfiligran.io/'}              | ${'a look-alike host'}
    ${'/app/service'}                         | ${'a relative link'}
    ${'#anchor'}                              | ${'an anchor'}
    ${'not a url'}                            | ${'an invalid url'}
  `('should leave a link to $description untouched', ({ href }) => {
    expect(
      withFiligranWebsiteUtm(href, {
        campaign: FiligranWebsiteUtmCampaign.OTHER,
        content: 'link',
      })
    ).toBe(href);
  });

  it('should overwrite existing utm values without duplicating them', () => {
    const utm = {
      campaign: FiligranWebsiteUtmCampaign.FOOTER,
      content: 'licenses',
    };

    const result = withFiligranWebsiteUtm(
      'https://filigran.io/licenses?utm_source=other&utm_campaign=old',
      utm
    );

    expect(result).toBe(
      `https://filigran.io/licenses?utm_source=xtm_hub&utm_campaign=footer&utm_medium=referral&utm_content=licenses`
    );
    expect(withFiligranWebsiteUtm(result, utm)).toBe(result);
  });
});

describe('getResourcePageFiligranWebsiteUtm', () => {
  it.each`
    identifier                                             | expectedContent
    ${ServiceDefinitionIdentifier.OpenctiCustomDashboards} | ${'custom_dashboard'}
    ${ServiceDefinitionIdentifier.OpenctiCustomViews}      | ${'custom_view'}
    ${ServiceDefinitionIdentifier.OpenctiIntegrations}     | ${'integration'}
    ${ServiceDefinitionIdentifier.OpenctiPlaybooks}        | ${'playbook'}
    ${ServiceDefinitionIdentifier.OpenaevScenarios}        | ${'other'}
    ${undefined}                                           | ${'other'}
  `(
    'should return utm_content=$expectedContent for $identifier',
    ({ identifier, expectedContent }) => {
      expect(getResourcePageFiligranWebsiteUtm(identifier)).toEqual({
        campaign: FiligranWebsiteUtmCampaign.RESOURCE_PAGE,
        content: expectedContent,
      });
    }
  );
});
