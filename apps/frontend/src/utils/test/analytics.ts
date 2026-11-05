import { resetAnalyticsState } from '@/lib/analytics/analytics.client';

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
