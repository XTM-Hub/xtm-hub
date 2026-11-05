import {
  initializeAnalytics,
  releaseAnalyticsEvents,
  revokeAnalyticsConsent,
  setAnalyticsPageContext,
  setAnalyticsUserProperties,
  trackEvent,
} from '@/lib/analytics/analytics.client';
import { type AnalyticsPageContext } from '@/lib/analytics/analytics.types';
import {
  readGtagCommands,
  readTrackedEvents,
  resetAnalyticsEnvironment,
} from '@/utils/test/analytics';
import { beforeEach, describe, expect, it } from 'vitest';

const MEASUREMENT_ID = 'G-TEST';
const GA_DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}` as const;
const ORIGIN = 'https://hub.filigran.io';
const RESOURCE_ID = 'resource-id';
const RESOURCE_TITLE = 'Ransomware playbook';
const RESOURCE_TYPE = 'opencti_playbook';

const badgeParams = {
  resource_id: RESOURCE_ID,
  resource_title: RESOURCE_TITLE,
  resource_type: RESOURCE_TYPE,
};

const makePageContext = (
  pagePath: string,
  contentGroup: AnalyticsPageContext['content_group']
): AnalyticsPageContext => ({
  page_location: `${ORIGIN}${pagePath}`,
  page_referrer: '',
  page_title: 'XTM Hub',
  content_group: contentGroup,
});

const homeContext = makePageContext('/en', 'Home');
const profileContext = makePageContext('/app/profile', 'Profile');

const pageViewParams = {
  ...homeContext,
  page_type: 'Home',
  page_template: '/[locale]',
} as const;

const startAnalytics = () => {
  initializeAnalytics(MEASUREMENT_ID);
  releaseAnalyticsEvents();
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

describe('releaseAnalyticsEvents', () => {
  it('should send nothing when the held events are not released yet', () => {
    // Given
    initializeAnalytics(MEASUREMENT_ID);

    // When
    trackEvent('page_view', pageViewParams);

    // Then
    expect(readTrackedEvents('page_view')).toEqual([]);
  });

  it('should send the held events in their order when they are released', () => {
    // Given
    initializeAnalytics(MEASUREMENT_ID);
    trackEvent('page_view', pageViewParams);
    trackEvent('ee_badge_click', badgeParams);

    // When
    releaseAnalyticsEvents();

    // Then
    expect(
      readGtagCommands()
        .filter(([command]) => command === 'event')
        .map(([, name]) => name)
    ).toEqual(['page_view', 'ee_badge_click']);
  });

  it('should send a held event with the page context of when it happened', () => {
    // Given
    initializeAnalytics(MEASUREMENT_ID);
    setAnalyticsPageContext(homeContext);
    trackEvent('ee_badge_click', badgeParams);
    setAnalyticsPageContext(profileContext);

    // When
    releaseAnalyticsEvents();

    // Then
    expect(readTrackedEvents('ee_badge_click')).toEqual([
      { ...homeContext, ...badgeParams },
    ]);
  });

  it('should drop the held events when analytics consent is withdrawn', () => {
    // Given
    initializeAnalytics(MEASUREMENT_ID);
    trackEvent('ee_badge_click', badgeParams);
    revokeAnalyticsConsent();

    // When
    releaseAnalyticsEvents();

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

describe('setAnalyticsUserProperties', () => {
  it.each([
    ['internal', 'Yes'],
    [null, 'No'],
  ] as const)(
    'should set the traffic type to %s when is_internal is %s',
    (trafficType, isInternal) => {
      // Given
      startAnalytics();

      // When
      setAnalyticsUserProperties({
        auth_state: 'Signed in',
        is_internal: isInternal,
        organization_type: 'Personal space',
        is_platform_admin: 'No',
        organization_role: 'Member',
      });

      // Then
      expect(readGtagCommands().slice(3)).toEqual([
        [
          'set',
          'user_properties',
          {
            auth_state: 'Signed in',
            is_internal: isInternal,
            organization_type: 'Personal space',
            is_platform_admin: 'No',
            organization_role: 'Member',
          },
        ],
        ['set', { traffic_type: trafficType }],
      ]);
    }
  );
});
