import {
  initializeAnalytics,
  revokeAnalyticsConsent,
  trackEvent,
} from '@/lib/analytics/analytics.client';
import {
  readGtagCommands,
  readTrackedEvents,
  resetAnalyticsEnvironment,
} from '@/utils/test/analytics';
import { beforeEach, describe, expect, it } from 'vitest';

const MEASUREMENT_ID = 'G-TEST';
const GA_DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}` as const;
const RESOURCE_ID = 'resource-id';
const RESOURCE_TITLE = 'Ransomware playbook';
const RESOURCE_TYPE = 'opencti_playbook';

const badgeParams = {
  resource_id: RESOURCE_ID,
  resource_title: RESOURCE_TITLE,
  resource_type: RESOURCE_TYPE,
};

const startAnalytics = () => {
  initializeAnalytics(MEASUREMENT_ID);
};

beforeEach(() => {
  resetAnalyticsEnvironment();
});

describe('trackEvent', () => {
  it('should send nothing when analytics was never initialized', () => {
    // Given / When
    trackEvent('ee_badge_click', badgeParams);

    // Then
    expect(window.dataLayer).toBeUndefined();
  });

  it('should send nothing when analytics consent was withdrawn', () => {
    // Given
    startAnalytics();
    revokeAnalyticsConsent();

    // When
    trackEvent('ee_badge_click', badgeParams);

    // Then
    expect(readTrackedEvents('ee_badge_click')).toEqual([]);
  });
});

describe('initializeAnalytics', () => {
  it('should deny advertising consent and turn off signals and page views when gtag is configured', () => {
    // Given / When
    initializeAnalytics(MEASUREMENT_ID);

    // Then
    expect(readGtagCommands()).toEqual([
      [
        'consent',
        'default',
        {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
      ],
      ['js', expect.any(Date)],
      [
        'config',
        MEASUREMENT_ID,
        {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
          cookie_expires: 34128000,
          cookie_update: false,
        },
      ],
    ]);
  });

  it('should enable the measurement again when consent comes back', () => {
    // Given
    initializeAnalytics(MEASUREMENT_ID);
    revokeAnalyticsConsent();

    // When
    initializeAnalytics(MEASUREMENT_ID);

    // Then
    expect(window[GA_DISABLE_KEY]).toBe(false);
  });

  it('should grant consent again instead of reconfiguring when consent comes back', () => {
    // Given
    initializeAnalytics(MEASUREMENT_ID);
    revokeAnalyticsConsent();

    // When
    initializeAnalytics(MEASUREMENT_ID);

    // Then
    expect(readGtagCommands().at(-1)).toEqual([
      'consent',
      'update',
      { analytics_storage: 'granted' },
    ]);
  });
});

describe('revokeAnalyticsConsent', () => {
  it('should deny analytics storage to gtag when consent is withdrawn', () => {
    // Given
    initializeAnalytics(MEASUREMENT_ID);

    // When
    revokeAnalyticsConsent();

    // Then
    expect(readGtagCommands().at(-1)).toEqual([
      'consent',
      'update',
      { analytics_storage: 'denied' },
    ]);
  });
});
