import {
  EMAIL_PATTERN,
  EVENT_WINDOW_MS,
  GA_COOKIE_EXPIRES_SECONDS,
  GA_DEFAULT_CONSENT,
  INTERNAL_TRAFFIC_TYPE,
  MAX_EVENTS_PER_WINDOW,
  MAX_ITEMS_PER_EVENT,
  MAX_PARAM_VALUE_LENGTH,
  MAX_PARAM_VALUE_LENGTHS,
  REDACTED_VALUE,
} from '@/lib/analytics/analytics.consts';
import {
  type AnalyticsEventName,
  type AnalyticsEvents,
  type AnalyticsItem,
  type AnalyticsPageContext,
  type AnalyticsUserProperties,
} from '@/lib/analytics/analytics.types';

type AnalyticsValue = string | number | null | readonly AnalyticsItem[];

type AnalyticsParams = Record<string, AnalyticsValue | undefined>;

type SentItem = Record<string, string | number>;

let configuredMeasurementId: string | null = null;
let enabledMeasurementId: string | null = null;
let pageContext: AnalyticsPageContext | null = null;
let recentEventTimestamps: number[] = [];
let heldEvents: [AnalyticsEventName, AnalyticsParams][] | null = null;
const enabledListeners = new Set<() => void>();

export const resetAnalyticsState = (): void => {
  configuredMeasurementId = null;
  enabledMeasurementId = null;
  pageContext = null;
  recentEventTimestamps = [];
  heldEvents = null;
};

export const isAnalyticsEnabled = (): boolean => enabledMeasurementId !== null;

export const subscribeAnalyticsEnabled = (
  listener: () => void
): (() => void) => {
  enabledListeners.add(listener);
  return () => {
    enabledListeners.delete(listener);
  };
};

const notifyAnalyticsEnabled = (): void => {
  enabledListeners.forEach((listener) => listener());
};

const getEnabledGtag = (): Window['gtag'] =>
  enabledMeasurementId ? window.gtag : undefined;

const sanitizeValue = (key: string, value: string): string =>
  EMAIL_PATTERN.test(value)
    ? REDACTED_VALUE
    : value.slice(0, MAX_PARAM_VALUE_LENGTHS[key] ?? MAX_PARAM_VALUE_LENGTH);

const sanitizeItem = (item: AnalyticsItem): SentItem =>
  Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key,
      typeof value === 'string' ? sanitizeValue(key, value) : value,
    ])
  );

const sanitizeParam = (
  key: string,
  value: AnalyticsValue
): string | number | null | SentItem[] => {
  if (typeof value === 'string') {
    return sanitizeValue(key, value);
  }
  if (typeof value === 'number' || value === null) {
    return value;
  }
  return value.slice(0, MAX_ITEMS_PER_EVENT).map(sanitizeItem);
};

const sanitizeParams = (
  params: AnalyticsParams
): Record<string, string | number | null | SentItem[]> =>
  Object.fromEntries(
    Object.entries(params)
      .filter(
        (entry): entry is [string, AnalyticsValue] => entry[1] !== undefined
      )
      .map(([key, value]) => [key, sanitizeParam(key, value)])
  );

const acceptsEvent = (name: AnalyticsEventName, now: number): boolean => {
  if (name === 'page_view') {
    return true;
  }
  recentEventTimestamps = recentEventTimestamps.filter(
    (timestamp) => now - timestamp < EVENT_WINDOW_MS
  );
  if (recentEventTimestamps.length >= MAX_EVENTS_PER_WINDOW) {
    return false;
  }
  recentEventTimestamps.push(now);
  return true;
};

const sendEvent = (name: AnalyticsEventName, params: AnalyticsParams): void => {
  const gtag = getEnabledGtag();
  if (!gtag || !acceptsEvent(name, Date.now())) {
    return;
  }
  gtag('event', name, sanitizeParams(params));
};

export const initializeAnalytics = (measurementId: string): void => {
  window.dataLayer ??= [];
  window.gtag ??= function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window[`ga-disable-${measurementId}`] = false;
  enabledMeasurementId = measurementId;
  heldEvents ??= [];
  notifyAnalyticsEnabled();
  if (configuredMeasurementId === measurementId) {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  window.gtag('consent', 'default', GA_DEFAULT_CONSENT);
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: GA_COOKIE_EXPIRES_SECONDS,
    cookie_update: false,
  });
  configuredMeasurementId = measurementId;
};

export const revokeAnalyticsConsent = (): void => {
  if (!enabledMeasurementId) {
    return;
  }
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  window[`ga-disable-${enabledMeasurementId}`] = true;
  enabledMeasurementId = null;
  heldEvents = null;
  notifyAnalyticsEnabled();
};

export const setAnalyticsPageContext = (
  context: AnalyticsPageContext
): void => {
  pageContext = context;
  getEnabledGtag()?.('set', sanitizeParams({ ...context }));
};

export const trackEvent = <Name extends AnalyticsEventName>(
  name: Name,
  params: AnalyticsEvents[Name]
): void => {
  if (heldEvents) {
    heldEvents.push([name, { ...pageContext, ...params }]);
    return;
  }
  sendEvent(name, { ...params });
};

export const releaseAnalyticsEvents = (): void => {
  const events = heldEvents ?? [];
  heldEvents = null;
  events.forEach(([name, params]) => sendEvent(name, params));
};

export const setAnalyticsUserProperties = (
  properties: AnalyticsUserProperties
): void => {
  const gtag = getEnabledGtag();
  if (!gtag) {
    return;
  }
  gtag('set', 'user_properties', properties);
  gtag('set', {
    traffic_type:
      properties.is_internal === 'Yes' ? INTERNAL_TRAFFIC_TYPE : null,
  });
};
