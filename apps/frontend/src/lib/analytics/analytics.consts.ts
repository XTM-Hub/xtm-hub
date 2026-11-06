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

export const MAX_PARAM_VALUE_LENGTH = 100;

export const MAX_PARAM_VALUE_LENGTHS: Record<string, number> = {
  page_location: 1000,
  page_referrer: 420,
  page_title: 300,
};

export const MAX_ITEMS_PER_EVENT = 25;

export const MIN_TRACKED_SEARCH_TERM_LENGTH = 3;

export const FILTER_NAME_LABELS = {
  label: 'Use case',
  entity_type: 'Entity type',
  integration_type: 'Integration type',
  solution_category: 'Solution category',
  license_type: 'License type',
  product_version: 'OpenCTI compatibility version',
  manager_supported: 'Deployment type',
  verified: 'Status',
} as const;

export const MAX_EVENTS_PER_WINDOW = 100;

export const EVENT_WINDOW_MS = 60_000;

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

export const ANALYTICS_ID_ATTRIBUTE = 'data-analytics-id';
export const ANALYTICS_SECTION_ATTRIBUTE = 'data-analytics-section';
export const ANALYTICS_RESOURCE_ID_ATTRIBUTE = 'data-analytics-resource-id';
export const ANALYTICS_RESOURCE_NAME_ATTRIBUTE = 'data-analytics-resource-name';
export const ANALYTICS_LIBRARY_ATTRIBUTE = 'data-analytics-library';
export const ANALYTICS_USE_CASES_ATTRIBUTE = 'data-analytics-use-cases';
export const ANALYTICS_EPIC_NAME_ATTRIBUTE = 'data-analytics-epic-name';
export const ANALYTICS_FEATURE_NAME_ATTRIBUTE = 'data-analytics-feature-name';
export const ANALYTICS_PRODUCT_ATTRIBUTE = 'data-analytics-product';

export const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="option"]',
  'input',
  'label',
  'select',
  'textarea',
  `[${ANALYTICS_ID_ATTRIBUTE}]`,
].join(', ');

export const SELECTION_CONTROL_SELECTOR =
  '[role="option"], [role="checkbox"], [role="menuitemcheckbox"], [role="menuitemradio"], input[type="checkbox"]';

export const SELECTION_CONTAINER_SELECTOR =
  '[role="listbox"], [role="menu"], [role="combobox"]';

export const POPPER_CONTENT_WRAPPER_SELECTOR =
  '[data-radix-popper-content-wrapper]';

export const PORTAL_CONTENT_SELECTOR = `${POPPER_CONTENT_WRAPPER_SELECTOR}, [role="dialog"], [role="alertdialog"], [role="menu"]`;

export const DISABLED_SELECTOR =
  ':disabled, [data-disabled]:not([data-disabled="false"])';

export const INHERITED_DISABLED_SELECTOR = '[aria-disabled="true"]';
