import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import {
  readGtagCommands,
  readTrackedEvents,
  resetAnalyticsEnvironment,
} from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { useParams, usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/external/GoogleAnalytics', () => ({
  default: () => null,
}));

const MEASUREMENT_ID = 'G-TEST';
const PAGE_TITLE = 'XTM Hub';
const SERVICE_INSTANCE_ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const LIST_PATHNAME = `/app/service/opencti_playbooks/${SERVICE_INSTANCE_ID}`;
const LIST_TEMPLATE = '/app/service/opencti_playbooks/[serviceInstanceId]';
const PUBLIC_PATHNAME = '/en/cybersecurity-solutions/opencti-playbooks';
const PROFILE_PATHNAME = '/app/profile';

const navigateTo = (pathname: string, params: Record<string, string>) => {
  window.history.replaceState({}, '', pathname);
  vi.mocked(usePathname).mockReturnValue(pathname);
  vi.mocked(useParams).mockReturnValue(params);
};

const renderTracker = () =>
  testRender(<AnalyticsTracker measurementId={MEASUREMENT_ID} />);

beforeEach(() => {
  resetAnalyticsEnvironment();
  document.title = PAGE_TITLE;
  navigateTo(LIST_PATHNAME, { serviceInstanceId: SERVICE_INSTANCE_ID });
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('AnalyticsTracker', () => {
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
