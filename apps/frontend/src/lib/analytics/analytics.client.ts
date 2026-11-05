import {
  GA_COOKIE_EXPIRES_SECONDS,
  GA_DEFAULT_CONSENT,
} from '@/lib/analytics/analytics.consts';
import {
  type AnalyticsEventName,
  type AnalyticsEvents,
  type AnalyticsPageContext,
} from '@/lib/analytics/analytics.types';

let configuredMeasurementId: string | null = null;
let enabledMeasurementId: string | null = null;

export const resetAnalyticsState = (): void => {
  configuredMeasurementId = null;
  enabledMeasurementId = null;
};

const getEnabledGtag = (): Window['gtag'] =>
  enabledMeasurementId ? window.gtag : undefined;

export const initializeAnalytics = (measurementId: string): void => {
  window.dataLayer ??= [];
  window.gtag ??= function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window[`ga-disable-${measurementId}`] = false;
  enabledMeasurementId = measurementId;
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
};

export const setAnalyticsPageContext = (
  context: AnalyticsPageContext
): void => {
  getEnabledGtag()?.('set', context);
};

export const trackEvent = <Name extends AnalyticsEventName>(
  name: Name,
  params: AnalyticsEvents[Name]
): void => {
  getEnabledGtag()?.('event', name, params);
};
