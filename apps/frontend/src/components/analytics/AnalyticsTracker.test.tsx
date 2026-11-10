import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { USER_PROPERTIES_WAIT_MS } from '@/lib/analytics/analytics.consts';
import {
  readGtagCommands,
  readTrackedEvents,
  resetAnalyticsEnvironment,
} from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { type MeAnalyticsQuery } from '@graphql/generated';
import { act } from '@testing-library/react';
import { useParams, usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useMeAnalyticsQuery: vi.fn() }));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useMeAnalyticsQuery: mocks.useMeAnalyticsQuery,
  });
});

vi.mock('@/components/external/GoogleAnalytics', () => ({
  default: () => null,
}));

const MEASUREMENT_ID = 'G-TEST';
const PAGE_TITLE = 'XTM Hub';
const ORGANIZATION_ID = 'organization-id';
const SERVICE_INSTANCE_ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const LIST_PATHNAME = `/app/service/opencti_playbooks/${SERVICE_INSTANCE_ID}`;
const LIST_TEMPLATE = '/app/service/opencti_playbooks/[serviceInstanceId]';
const PUBLIC_PATHNAME = '/en/cybersecurity-solutions/opencti-playbooks';
const PROFILE_PATHNAME = '/app/profile';

const signedInUser: MeAnalyticsQuery = {
  me: {
    email: 'jane@acme.com',
    selected_organization_id: ORGANIZATION_ID,
    organizations: [{ id: ORGANIZATION_ID, personal_space: false }],
    capabilities: [],
    selected_org_capabilities: [],
  },
};

const mockLoadedUserQuery = (data: MeAnalyticsQuery) =>
  mocks.useMeAnalyticsQuery.mockReturnValue({ data, isPending: false });

const mockPendingUserQuery = () =>
  mocks.useMeAnalyticsQuery.mockReturnValue({
    data: undefined,
    isPending: true,
  });

const mockFailedUserQuery = () =>
  mocks.useMeAnalyticsQuery.mockReturnValue({
    data: undefined,
    isPending: false,
  });

const navigateTo = (pathname: string, params: Record<string, string>) => {
  window.history.replaceState({}, '', pathname);
  vi.mocked(usePathname).mockReturnValue(pathname);
  vi.mocked(useParams).mockReturnValue(params);
};

const renderTracker = () =>
  testRender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);

const readUserPropertiesAndPageViews = () =>
  readGtagCommands()
    .map(([, target]) => target)
    .filter((target) => target === 'user_properties' || target === 'page_view');

beforeEach(() => {
  resetAnalyticsEnvironment();
  document.title = PAGE_TITLE;
  mockLoadedUserQuery(signedInUser);
  navigateTo(LIST_PATHNAME, { serviceInstanceId: SERVICE_INSTANCE_ID });
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState({}, '', '/');
});

describe('AnalyticsTracker', () => {
  it('should set the user properties before the page view when the user is already known', () => {
    // Given / When
    renderTracker();

    // Then
    expect(readUserPropertiesAndPageViews()).toEqual([
      'user_properties',
      'page_view',
    ]);
  });

  it('should send the page view after the user properties when the user loads after the page', () => {
    // Given
    mockPendingUserQuery();
    const { rerender } = renderTracker();
    mockLoadedUserQuery(signedInUser);

    // When
    rerender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);

    // Then
    expect(readUserPropertiesAndPageViews()).toEqual([
      'user_properties',
      'page_view',
    ]);
  });

  it.each([
    ['hold', USER_PROPERTIES_WAIT_MS - 1, 0],
    ['send', USER_PROPERTIES_WAIT_MS, 1],
  ])(
    'should %s the page view %s ms after the start when the user is still unknown',
    (_outcome, elapsedMs, pageViewCount) => {
      // Given
      vi.useFakeTimers();
      mockPendingUserQuery();
      renderTracker();

      // When
      act(() => vi.advanceTimersByTime(elapsedMs));

      // Then
      expect(readTrackedEvents('page_view')).toHaveLength(pageViewCount);
    }
  );

  it('should send the page view without user properties when the user query fails', () => {
    // Given
    mockFailedUserQuery();

    // When
    renderTracker();

    // Then
    expect(readUserPropertiesAndPageViews()).toEqual(['page_view']);
  });

  it('should set the user properties when they arrive after the wait', () => {
    // Given
    vi.useFakeTimers();
    mockPendingUserQuery();
    const { rerender } = renderTracker();
    act(() => vi.advanceTimersByTime(USER_PROPERTIES_WAIT_MS));
    mockLoadedUserQuery(signedInUser);

    // When
    rerender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);

    // Then
    expect(readUserPropertiesAndPageViews()).toEqual([
      'page_view',
      'user_properties',
    ]);
  });

  it('should send each page view with its own location when the visitor navigates during the wait', () => {
    // Given
    mockPendingUserQuery();
    const { rerender } = renderTracker();
    navigateTo(PROFILE_PATHNAME, {});
    rerender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);
    mockLoadedUserQuery(signedInUser);

    // When
    rerender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);

    // Then
    expect(readTrackedEvents('page_view')).toEqual([
      expect.objectContaining({
        page_location: `${window.location.origin}${LIST_TEMPLATE}`,
        content_group: 'Library',
      }),
      expect.objectContaining({
        page_location: `${window.location.origin}${PROFILE_PATHNAME}`,
        content_group: 'Profile',
      }),
    ]);
  });

  it('should set the page context and send it with the page view when a page opens', () => {
    // Given / When
    renderTracker();

    // Then
    const pageContext = {
      page_location: `${window.location.origin}${LIST_TEMPLATE}`,
      page_referrer: '',
      page_title: PAGE_TITLE,
      content_group: 'Library',
    };
    expect(readGtagCommands().slice(-2)).toEqual([
      ['set', pageContext],
      [
        'event',
        'page_view',
        {
          ...pageContext,
          page_type: 'Library',
          page_template: LIST_TEMPLATE,
        },
      ],
    ]);
  });

  it('should send the platform product with the page view when a platform details page opens', () => {
    // Given
    navigateTo(`/app/service/xtmone_registration/${SERVICE_INSTANCE_ID}`, {
      serviceInstanceId: SERVICE_INSTANCE_ID,
    });

    // When
    renderTracker();

    // Then
    expect(readTrackedEvents('page_view')).toEqual([
      expect.objectContaining({ product: 'XTM One' }),
    ]);
  });

  it('should send the previous page location as the referrer when the visitor navigates', () => {
    // Given
    navigateTo(PUBLIC_PATHNAME, { locale: 'en', slug: 'opencti-playbooks' });
    const { rerender } = renderTracker();
    navigateTo(PROFILE_PATHNAME, {});

    // When
    rerender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);

    // Then
    expect(readTrackedEvents('page_view').at(-1)).toEqual(
      expect.objectContaining({
        page_referrer: `${window.location.origin}${PUBLIC_PATHNAME}`,
      })
    );
  });

  it('should not send another page view when only the route params object changes', () => {
    // Given
    const { rerender } = renderTracker();
    vi.mocked(useParams).mockReturnValue({
      serviceInstanceId: SERVICE_INSTANCE_ID,
    });

    // When
    rerender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);

    // Then
    expect(readTrackedEvents('page_view')).toHaveLength(1);
  });
});
