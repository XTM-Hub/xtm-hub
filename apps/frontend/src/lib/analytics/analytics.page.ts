import {
  EMAIL_PATTERN,
  GOOGLE_REFERRER_HOST_PATTERN,
  KEPT_QUERY_PARAM_PATTERN,
  KNOWN_REFERRER_DOMAINS,
  OTHER_REFERRER,
  REDACTED_VALUE,
  URL_PATTERN,
} from '@/lib/analytics/analytics.consts';
import {
  type AnalyticsPage,
  type AnalyticsPageType,
} from '@/lib/analytics/analytics.types';
import { APP_PATH } from '@/utils/path/constant';

type AnalyticsRouteParams = Record<string, string | string[] | undefined>;

const UUID_SEGMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESOURCE_SERVICES =
  'openaev_scenarios|opencti_custom_dashboards|opencti_custom_views|opencti_integrations|opencti_playbooks';

const PAGE_TYPE_RULES: ReadonlyArray<[RegExp, AnalyticsPageType]> = [
  [/^\/(\[locale\])?$/, 'Home'],
  [/^\/app$/, 'Home'],
  [/^\/app\/admin\/csm-board(\/|$)/, 'CSM board'],
  [/^\/app\/admin(\/|$)/, 'Admin'],
  [/^\/app\/profile(\/|$)/, 'Profile'],
  [
    /^\/\[locale\]\/cybersecurity-solutions\/xtm-platform-roadmap(\/|$)/,
    'Roadmap',
  ],
  [/^\/app\/service\/xtm_platform_roadmap(\/|$)/, 'Roadmap'],
  [/^\/\[locale\]\/cybersecurity-solutions\/xtm-platform-trial(\/|$)/, 'Trial'],
  [/^\/app\/service\/xtm-platform-trial-guide(\/|$)/, 'Trial guide'],
  [/^\/app\/service\/xtm-platform-trial(\/|$)/, 'Trial'],
  [
    /^\/app\/service\/(opencti|openaev|xtmone)_registration\/\[serviceInstanceId\]$/,
    'Platform details',
  ],
  [/^\/\[locale\]\/cybersecurity-solutions\/\[slug\]$/, 'Library'],
  [
    /^\/\[locale\]\/cybersecurity-solutions\/\[slug\]\/\[docSlug\]$/,
    'Resource page',
  ],
  [
    new RegExp(`^/app/service/(${RESOURCE_SERVICES})/\\[serviceInstanceId\\]$`),
    'Library',
  ],
  [
    new RegExp(
      `^/app/service/(${RESOURCE_SERVICES})/\\[serviceInstanceId\\]/\\[documentId\\]$`
    ),
    'Resource page',
  ],
];

const RELAY_GLOBAL_ID_PATTERN =
  /^[A-Za-z_]+:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const toAnalyticsResourceId = (id: string): string => {
  if (!BASE64_PATTERN.test(id)) {
    return id;
  }
  try {
    return atob(id).match(RELAY_GLOBAL_ID_PATTERN)?.[1] ?? id;
  } catch {
    return id;
  }
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const isIdSegment = (segment: string): boolean => {
  const decoded = safeDecode(segment);
  return (
    UUID_SEGMENT_PATTERN.test(decoded) ||
    toAnalyticsResourceId(decoded) !== decoded
  );
};

const toPageTemplate = (
  pathname: string,
  params: AnalyticsRouteParams
): string => {
  const segments = pathname.split('/').filter(Boolean);
  let end = segments.length;

  Object.entries(params)
    .reverse()
    .forEach(([name, value]) => {
      if (typeof value !== 'string') {
        return;
      }
      const index = segments.findLastIndex(
        (segment, position) =>
          position < end && safeDecode(segment) === safeDecode(value)
      );
      if (index === -1) {
        return;
      }
      segments[index] = `[${name}]`;
      end = index;
    });

  return `/${segments
    .map((segment) => (isIdSegment(segment) ? '[id]' : segment))
    .join('/')}`;
};

const isPersonalValue = (value: string): boolean =>
  EMAIL_PATTERN.test(value) || URL_PATTERN.test(value);

const isPrivatePath = (pathname: string): boolean =>
  pathname === `/${APP_PATH}` || pathname.startsWith(`/${APP_PATH}/`);

const toKeptQueryString = (search: string): string => {
  const keptParams = new URLSearchParams(
    [...new URLSearchParams(search)]
      .filter(([name]) => KEPT_QUERY_PARAM_PATTERN.test(name))
      .map(([name, value]) => [
        name,
        isPersonalValue(safeDecode(value)) ? REDACTED_VALUE : value,
      ])
  ).toString();
  return keptParams ? `?${keptParams}` : '';
};

export const toAnalyticsPageLocation = (
  location: Pick<Location, 'origin' | 'pathname' | 'search'>,
  pageTemplate: string
): string => {
  const path = isPrivatePath(location.pathname)
    ? pageTemplate
    : location.pathname;
  return `${location.origin}${path}${toKeptQueryString(location.search)}`;
};

const isKnownReferrerHost = (hostname: string): boolean =>
  GOOGLE_REFERRER_HOST_PATTERN.test(hostname) ||
  KNOWN_REFERRER_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

export const toAnalyticsReferrer = (
  referrer: string,
  origin: string
): string => {
  if (!referrer) {
    return '';
  }
  try {
    const url = new URL(referrer);
    if (url.origin === origin) {
      return toAnalyticsPageLocation(
        { origin, pathname: url.pathname, search: '' },
        toPageTemplate(url.pathname, {})
      );
    }
    return isKnownReferrerHost(url.hostname) ? url.origin : OTHER_REFERRER;
  } catch {
    return OTHER_REFERRER;
  }
};

export const resolveAnalyticsPage = (
  pathname: string,
  params: AnalyticsRouteParams
): AnalyticsPage => {
  const pageTemplate = toPageTemplate(pathname, params);
  return {
    page_type:
      PAGE_TYPE_RULES.find(([pattern]) => pattern.test(pageTemplate))?.[1] ??
      'Other',
    page_template: pageTemplate,
  };
};
