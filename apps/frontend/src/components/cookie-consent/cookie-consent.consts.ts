import {
  type ConsentCategory,
  type ConsentRegistry,
} from '@/components/cookie-consent/cookie-consent.types';
import { GA_CONSENT_SERVICE_ID } from '@/lib/analytics/analytics.consts';
import {
  FiligranWebsiteUtmCampaign,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';

const COOKIE_CONSENT_PRIVACY_POLICY_URL = withFiligranWebsiteUtm(
  'https://filigran.io/privacy-policy',
  {
    campaign: FiligranWebsiteUtmCampaign.OTHER,
    content: 'cookie_consent_privacy_policy',
  }
);

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  'necessary',
  'functional',
  'marketing',
  'analytics',
];

export const CONSENT_COOKIE_NAME = 'xtmhub_consent';

export const EMBED_SEGMENT = '(embed)';

export const CONSENT_VERSION = 1;

export const CONSENT_MAX_AGE_DAYS = 180;

export const CONSENT_REGISTRY: ConsentRegistry = {
  necessary: {
    required: true,
    services: [],
  },
  functional: {
    required: false,
    services: [],
  },
  marketing: {
    required: false,
    services: [
      {
        id: 'hubspot',
        name: 'HubSpot',
        cookies: ['__hstc', '__hssc', '__hssrc', 'hubspotutk'],
        readMoreUrl: COOKIE_CONSENT_PRIVACY_POLICY_URL,
      },
    ],
  },
  analytics: {
    required: false,
    services: [
      {
        id: GA_CONSENT_SERVICE_ID,
        name: 'Google Analytics (GA4)',
        cookies: [
          '_ga',
          '_ga_*',
          '_gid',
          '_gat',
          '_gat_*',
          '_gcl_au',
          '_gac_*',
        ],
        readMoreUrl: COOKIE_CONSENT_PRIVACY_POLICY_URL,
      },
    ],
  },
};
