import {
  initializeAnalytics,
  releaseAnalyticsEvents,
  revokeAnalyticsConsent,
  setAnalyticsPageContext,
  setAnalyticsUserProperties,
  trackEvent,
} from '@/lib/analytics/analytics.client';
import {
  EVENT_WINDOW_MS,
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
} from '@/lib/analytics/analytics.types';
import {
  readGtagCommands,
  readTrackedEvents,
  resetAnalyticsEnvironment,
} from '@/utils/test/analytics';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MEASUREMENT_ID = 'G-TEST';
const GA_DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}` as const;
const ORIGIN = 'https://hub.filigran.io';
const RESOURCE_ID = 'resource-id';
const RESOURCE_TITLE = 'Ransomware playbook';
const RESOURCE_TYPE = 'opencti_playbook';
const RESULT_COUNT = 42;

type TrackedEvent = {
  [Name in AnalyticsEventName]: [Name, AnalyticsEvents[Name]];
}[AnalyticsEventName];

const badgeParams = {
  resource_id: RESOURCE_ID,
  resource_title: RESOURCE_TITLE,
  resource_type: RESOURCE_TYPE,
};

const item: AnalyticsItem = {
  item_id: RESOURCE_ID,
  item_name: RESOURCE_TITLE,
  item_category: 'Playbooks',
  item_brand: 'OpenCTI',
  index: 0,
};

const viewItemParams: AnalyticsEvents['view_item'] = {
  resource_id: RESOURCE_ID,
  resource_name: RESOURCE_TITLE,
  library: 'Playbooks',
  product: 'OpenCTI',
  items: [item],
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

const trackBadgeClicks = (count: number) => {
  for (let index = 0; index < count; index += 1) {
    trackEvent('ee_badge_click', badgeParams);
  }
};

beforeEach(() => {
  resetAnalyticsEnvironment();
});

afterEach(() => {
  vi.useRealTimers();
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

  it('should send a page view when the flood cap is reached', () => {
    // Given
    startAnalytics();
    trackBadgeClicks(MAX_EVENTS_PER_WINDOW);

    // When
    trackEvent('page_view', pageViewParams);

    // Then
    expect(readTrackedEvents('page_view')).toHaveLength(1);
  });

  it.each<TrackedEvent>([['generate_lead', { lead_source: 'Sales contact' }]])(
    'should send %s when the flood cap is reached',
    (name, params) => {
      // Given
      startAnalytics();
      trackBadgeClicks(MAX_EVENTS_PER_WINDOW);

      // When
      trackEvent(name, params);

      // Then
      expect(readTrackedEvents(name)).toHaveLength(1);
    }
  );

  it.each([
    ['drop', EVENT_WINDOW_MS - 1, 0],
    ['accept', EVENT_WINDOW_MS, 1],
  ])(
    'should %s the next event when %s ms have passed since the flood cap was reached',
    (_outcome, elapsedMs, acceptedCount) => {
      // Given
      vi.useFakeTimers();
      startAnalytics();
      trackBadgeClicks(MAX_EVENTS_PER_WINDOW);
      vi.advanceTimersByTime(elapsedMs);

      // When
      trackEvent('ee_badge_click', badgeParams);

      // Then
      expect(readTrackedEvents('ee_badge_click')).toHaveLength(
        MAX_EVENTS_PER_WINDOW + acceptedCount
      );
    }
  );

  it.each([
    [
      'page_location',
      MAX_PARAM_VALUE_LENGTHS.page_location,
      `${ORIGIN}/${'a'.repeat(2000)}`,
    ],
    [
      'page_referrer',
      MAX_PARAM_VALUE_LENGTHS.page_referrer,
      `${ORIGIN}/${'a'.repeat(2000)}`,
    ],
    ['page_title', MAX_PARAM_VALUE_LENGTHS.page_title, 'a'.repeat(2000)],
    ['page_template', MAX_PARAM_VALUE_LENGTH, 'a'.repeat(2000)],
  ])(
    'should cut %s at %s characters when it is longer',
    (key, maxLength, value) => {
      // Given
      startAnalytics();

      // When
      trackEvent('page_view', { ...pageViewParams, [key]: value });

      // Then
      expect(readTrackedEvents('page_view')).toEqual([
        expect.objectContaining({ [key]: value.slice(0, maxLength) }),
      ]);
    }
  );

  it.each([
    ['jane.doe@acme.com', REDACTED_VALUE],
    ['Contact jane.doe@acme.com for access', REDACTED_VALUE],
    [RESOURCE_TITLE, RESOURCE_TITLE],
  ])(
    'should send %s as %s when it is a parameter value',
    (resourceTitle, sentValue) => {
      // Given
      startAnalytics();

      // When
      trackEvent('ee_badge_click', {
        ...badgeParams,
        resource_title: resourceTitle,
      });

      // Then
      expect(readTrackedEvents('ee_badge_click')).toEqual([
        expect.objectContaining({ resource_title: sentValue }),
      ]);
    }
  );

  it.each([
    ['jane.doe@acme.com', REDACTED_VALUE],
    ['a'.repeat(2000), 'a'.repeat(MAX_PARAM_VALUE_LENGTH)],
  ])(
    'should send the item name %s as %s when it is inside the items',
    (itemName, sentItemName) => {
      // Given
      startAnalytics();

      // When
      trackEvent('view_item', {
        ...viewItemParams,
        items: [{ ...item, item_name: itemName }],
      });

      // Then
      expect(readTrackedEvents('view_item')).toEqual([
        expect.objectContaining({
          items: [expect.objectContaining({ item_name: sentItemName })],
        }),
      ]);
    }
  );

  it('should send only the first items when more items than the cap are tracked', () => {
    // Given
    startAnalytics();
    const items = Array.from(
      { length: MAX_ITEMS_PER_EVENT + 1 },
      (_value, index) => ({ ...item, index })
    );

    // When
    trackEvent('view_item', { ...viewItemParams, items });

    // Then
    expect(readTrackedEvents('view_item')).toEqual([
      expect.objectContaining({
        items: items.slice(0, MAX_ITEMS_PER_EVENT),
      }),
    ]);
  });

  it('should send a number parameter as a number when it is tracked', () => {
    // Given
    startAnalytics();

    // When
    trackEvent('search', {
      library: 'Playbooks',
      product: 'OpenCTI',
      search_term: RESOURCE_TITLE,
      result_count: RESULT_COUNT,
      has_results: 'Yes',
    });

    // Then
    expect(readTrackedEvents('search')).toEqual([
      expect.objectContaining({ result_count: RESULT_COUNT }),
    ]);
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
