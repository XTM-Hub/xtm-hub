import {
  FiligranWebsiteUtmCampaign,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';

export const XTM_ONE_ABOUT_URL = withFiligranWebsiteUtm(
  'https://filigran.io/products/xtm-one',
  { campaign: FiligranWebsiteUtmCampaign.SIDEBAR, content: 'xtm_one_about' }
);

export const OPENCRQ_ABOUT_URL = withFiligranWebsiteUtm(
  'https://filigran.io/products/opencrq',
  { campaign: FiligranWebsiteUtmCampaign.SIDEBAR, content: 'opencrq_about' }
);

export const FILIGRAN_BLOG_URL = withFiligranWebsiteUtm(
  'https://filigran.io/blog',
  { campaign: FiligranWebsiteUtmCampaign.SIDEBAR, content: 'blog' }
);
