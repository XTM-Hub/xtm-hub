'use client';

import GoogleAnalytics from '@/components/external/GoogleAnalytics';
import {
  initializeAnalytics,
  releaseAnalyticsEvents,
  setAnalyticsPageContext,
  setAnalyticsUserProperties,
  trackEvent,
} from '@/lib/analytics/analytics.client';
import { USER_PROPERTIES_WAIT_MS } from '@/lib/analytics/analytics.consts';
import {
  resolveAnalyticsPage,
  toAnalyticsPageLocation,
  toAnalyticsReferrer,
} from '@/lib/analytics/analytics.page';
import { toAnalyticsUserProperties } from '@/lib/analytics/analytics.user';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useMeAnalyticsQuery } from '@graphql/generated';
import { meAnalyticsKeys } from '@graphql/me/me.keys';
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
  const { data, isPending } = useMeAnalyticsQuery(
    portalGraphqlClient,
    undefined,
    {
      queryKey: meAnalyticsKeys.detail(),
      retry: false,
      staleTime: Infinity,
    }
  );
  const trackedPathname = useRef<string | null>(null);
  const trackedPageLocation = useRef<string | null>(null);

  useLayoutEffect(() => {
    initializeAnalytics(measurementId);
    const timeout = window.setTimeout(
      releaseAnalyticsEvents,
      USER_PROPERTIES_WAIT_MS
    );
    return () => window.clearTimeout(timeout);
  }, [measurementId]);

  useLayoutEffect(() => {
    if (isPending) {
      return;
    }
    if (data) {
      setAnalyticsUserProperties(toAnalyticsUserProperties(data.me));
    }
    releaseAnalyticsEvents();
  }, [isPending, data]);

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
