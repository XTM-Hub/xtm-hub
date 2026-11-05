import {
  GA_COOKIE_EXPIRES_SECONDS,
  GA_DEFAULT_CONSENT,
  INTERNAL_TRAFFIC_TYPE,
} from '@/lib/analytics/analytics.consts';
import {
  type AnalyticsEventName,
  type AnalyticsEvents,
  type AnalyticsPageContext,
  type AnalyticsUserProperties,
} from '@/lib/analytics/analytics.types';

type AnalyticsParams = Record<string, string | null | undefined>;

let configuredMeasurementId: string | null = null;
let enabledMeasurementId: string | null = null;
let pageContext: AnalyticsPageContext | null = null;
let heldEvents: [AnalyticsEventName, AnalyticsParams][] | null = null;

export const resetAnalyticsState = (): void => {
  configuredMeasurementId = null;
  enabledMeasurementId = null;
  pageContext = null;
  heldEvents = null;
};

const getEnabledGtag = (): Window['gtag'] =>
  enabledMeasurementId ? window.gtag : undefined;

const sendEvent = (name: AnalyticsEventName, params: AnalyticsParams): void => {
  getEnabledGtag()?.('event', name, params);
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
};

export const setAnalyticsPageContext = (
  context: AnalyticsPageContext
): void => {
  pageContext = context;
  getEnabledGtag()?.('set', context);
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
