'use client';

import GoogleAnalytics from '@/components/external/GoogleAnalytics';
import { initializeAnalytics } from '@/lib/analytics/analytics.client';
import { useLayoutEffect } from 'react';

interface AnalyticsTrackerProps {
  measurementId: string;
}

const AnalyticsTracker = ({ measurementId }: AnalyticsTrackerProps) => {
  useLayoutEffect(() => {
    initializeAnalytics(measurementId);
  }, [measurementId]);

  return <GoogleAnalytics measurementId={measurementId} />;
};

export default AnalyticsTracker;
