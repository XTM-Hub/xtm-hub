import { ServiceDefinitionIdentifier } from '@graphql/generated';

const FILIGRAN_WEBSITE_HOSTS = ['filigran.io', 'www.filigran.io'];
const FILIGRAN_WEBSITE_UTM_SOURCE = 'xtm_hub';
const FILIGRAN_WEBSITE_UTM_MEDIUM = 'referral';

// Where the link sits in the hub
export enum FiligranWebsiteUtmCampaign {
  SIDEBAR = 'sidebar',
  FOOTER = 'footer',
  HOME_BANNER = 'home_banner',
  RESOURCE_PAGE = 'resource_page',
  OTHER = 'other',
}

export interface FiligranWebsiteUtm {
  campaign: FiligranWebsiteUtmCampaign;
  // Which link was clicked, lowercase_snake_case
  content: string;
}

const RESOURCE_PAGE_UTM_CONTENT_FALLBACK = 'other';

const resourcePageUtmContentMapping: Partial<
  Record<ServiceDefinitionIdentifier, string>
> = {
  [ServiceDefinitionIdentifier.OpenctiCustomDashboards]: 'custom_dashboard',
  [ServiceDefinitionIdentifier.OpenctiCustomViews]: 'custom_view',
  [ServiceDefinitionIdentifier.OpenctiIntegrations]: 'integration',
  [ServiceDefinitionIdentifier.OpenctiPlaybooks]: 'playbook',
};

export const getResourcePageFiligranWebsiteUtm = (
  serviceDefinitionIdentifier: string | null | undefined
): FiligranWebsiteUtm => ({
  campaign: FiligranWebsiteUtmCampaign.RESOURCE_PAGE,
  content:
    resourcePageUtmContentMapping[
      serviceDefinitionIdentifier as ServiceDefinitionIdentifier
    ] ?? RESOURCE_PAGE_UTM_CONTENT_FALLBACK,
});

/**
 * Tags a link pointing to filigran.io so the website analytics can tell which hub placement sent the visit.
 * Any other host (hub, docs, academy...) or unparsable href is returned untouched.
 * Overwrites existing utm_* values and keeps every other query parameter and the fragment.
 */
export const withFiligranWebsiteUtm = (
  href: string,
  { campaign, content }: FiligranWebsiteUtm
): string => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (!FILIGRAN_WEBSITE_HOSTS.includes(url.hostname)) {
    return href;
  }

  url.searchParams.set('utm_source', FILIGRAN_WEBSITE_UTM_SOURCE);
  url.searchParams.set('utm_medium', FILIGRAN_WEBSITE_UTM_MEDIUM);
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', content);
  return url.toString();
};
