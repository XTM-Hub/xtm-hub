'use client';

import GoogleAnalytics from '@/components/external/GoogleAnalytics';
import {
  initializeAnalytics,
  setAnalyticsPageContext,
  trackEvent,
} from '@/lib/analytics/analytics.client';
import {
  resolveAnalyticsPage,
  toAnalyticsPageLocation,
  toAnalyticsReferrer,
} from '@/lib/analytics/analytics.page';
import { useParams, usePathname } from 'next/navigation';
import { useLayoutEffect, useMemo, useRef } from 'react';

interface AnalyticsTrackerProps {
  measurementId: string;
}

const AnalyticsTracker = ({ measurementId }: AnalyticsTrackerProps) => {
  const pathname = usePathname();
  const params = useParams();
  const page = useMemo(
    () => resolveAnalyticsPage(pathname, params),
    [pathname, params]
  );
  const trackedPathname = useRef<string | null>(null);
  const trackedPageLocation = useRef<string | null>(null);

  useLayoutEffect(() => {
    initializeAnalytics(measurementId);
  }, [measurementId]);

  useLayoutEffect(() => {
    if (trackedPathname.current === pathname) {
      return;
    }
    trackedPathname.current = pathname;
    const pageLocation = toAnalyticsPageLocation(
      window.location,
      page.page_template
    );
    const context = {
      page_location: pageLocation,
      page_referrer:
        trackedPageLocation.current ??
        toAnalyticsReferrer(document.referrer, window.location.origin),
      page_title: document.title,
      content_group: page.page_type,
    };
    trackedPageLocation.current = pageLocation;
    setAnalyticsPageContext(context);
    trackEvent('page_view', { ...context, ...page });
  }, [pathname, page]);

  return <GoogleAnalytics measurementId={measurementId} />;
};

export default AnalyticsTracker;
