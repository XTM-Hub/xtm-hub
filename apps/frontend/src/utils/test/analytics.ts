import {
  initializeAnalytics,
  releaseAnalyticsEvents,
  resetAnalyticsState,
} from '@/lib/analytics/analytics.client';

export const resetAnalyticsEnvironment = (): void => {
  delete window.dataLayer;
  delete window.gtag;
  Object.keys(window)
    .filter((key) => key.startsWith('ga-disable-'))
    .forEach((key) => {
      Reflect.deleteProperty(window, key);
    });
  resetAnalyticsState();
};

export const readGtagCommands = (): unknown[][] =>
  (window.dataLayer ?? []).map((entry) => Array.from(entry));

const isEventParams = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const readTrackedEvents = (name: string): unknown[] =>
  readGtagCommands()
    .filter(([command, eventName]) => command === 'event' && eventName === name)
    .map(([, , params]) => params)
    .filter(isEventParams)
    .map(({ send_to: _sendTo, ...eventParams }) => eventParams);

export const startAnalytics = (): void => {
  resetAnalyticsEnvironment();
  initializeAnalytics('G-TEST');
  releaseAnalyticsEvents();
};
