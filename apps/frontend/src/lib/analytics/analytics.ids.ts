const ANALYTICS_DOMAINS = {
  account: 'Account',
  admin: 'Admin',
  common: 'Common',
  consent: 'Consent',
  ee: 'Enterprise Edition',
  footer: 'Footer',
  home: 'Home',
  list: 'Lists',
  nav: 'Navigation',
  notification: 'Notification',
  organization: 'Organization',
  platform: 'Platforms',
  resource: 'Resources',
  roadmap: 'Roadmap',
  subscription: 'Subscription',
  trial: 'Trial',
} as const;

export type AnalyticsDomainPrefix = keyof typeof ANALYTICS_DOMAINS;

type AnalyticsDomain = (typeof ANALYTICS_DOMAINS)[AnalyticsDomainPrefix];

const ANALYTICS_VERBS = [
  'open',
  'close',
  'toggle',
  'select',
  'submit',
  'confirm',
  'cancel',
  'create',
  'edit',
  'delete',
  'copy',
  'download',
  'upload',
  'deploy',
  'share',
  'join',
  'contact',
  'vote',
  'invite',
  'remove',
  'filter',
  'search',
  'export',
  'import',
  'refresh',
];

const ELEMENT_ID_PATTERN = /^[a-z]+(_[a-z]+)+$/;

const ELEMENT_ID_VERB_PATTERN = new RegExp(
  `_(${ANALYTICS_VERBS.join('|')})(_signup)?$`
);

const CLICK_ACTION_PATTERN = /^click\b/i;

export interface AnalyticsElementDefinition {
  action: string;
}

const isAnalyticsDomainPrefix = (
  value: string
): value is AnalyticsDomainPrefix => Object.hasOwn(ANALYTICS_DOMAINS, value);

export const getAnalyticsDomain = (id: string): AnalyticsDomain | undefined => {
  const [prefix = ''] = id.split('_');
  return isAnalyticsDomainPrefix(prefix)
    ? ANALYTICS_DOMAINS[prefix]
    : undefined;
};

export const findAnalyticsRegistryErrors = (
  registry: Record<string, AnalyticsElementDefinition>
): string[] => {
  const actions = Object.values(registry).map(({ action }) => action);
  return Object.entries(registry).flatMap(([id, { action }]) =>
    [
      !ELEMENT_ID_PATTERN.test(id) && `${id}: the key is not snake_case`,
      !getAnalyticsDomain(id) && `${id}: the domain is not in the list`,
      !ELEMENT_ID_VERB_PATTERN.test(id) && `${id}: the verb is not in the list`,
      actions.indexOf(action) !== actions.lastIndexOf(action) &&
        `${id}: the action "${action}" is not unique`,
      CLICK_ACTION_PATTERN.test(action) &&
        `${id}: the action "${action}" starts with Click`,
    ].filter((error) => error !== false)
  );
};
