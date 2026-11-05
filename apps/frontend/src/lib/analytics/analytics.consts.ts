export const GA_MEASUREMENT_ID = 'G-9FC0TL0TH3';

export const GA_PRODUCTION_HOST = 'hub.filigran.io';

export const GA_CONSENT_SERVICE_ID = 'google-analytics';

export const GA_DEFAULT_CONSENT = {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
} as const;

export const GA_COOKIE_EXPIRES_SECONDS = 34_128_000;

export const USER_PROPERTIES_WAIT_MS = 2_000;

export const REDACTED_VALUE = '[redacted]';

export const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

export const URL_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;

export const KEPT_QUERY_PARAM_PATTERN = /^(utm_.+|gclid)$/;

export const OTHER_REFERRER = 'Other';

export const KNOWN_REFERRER_DOMAINS = [
  'bing.com',
  'duckduckgo.com',
  'filigran.io',
  'linkedin.com',
  'github.com',
  'slack.com',
  't.co',
  'twitter.com',
  'x.com',
  'youtube.com',
];

export const GOOGLE_REFERRER_HOST_PATTERN = /(^|\.)google(\.[a-z]{2,3}){1,2}$/;

export const INTERNAL_TRAFFIC_TYPE = 'internal';

export const INTERNAL_EMAIL_DOMAIN = 'filigran.io';
