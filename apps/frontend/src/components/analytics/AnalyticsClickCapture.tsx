'use client';

import {
  buildClickParams,
  findTrackedElement,
} from '@/lib/analytics/analytics.click';
import { trackEvent } from '@/lib/analytics/analytics.client';
import { type AnalyticsPageType } from '@/lib/analytics/analytics.types';
import { useEffect, useLayoutEffect, useRef } from 'react';

interface AnalyticsClickCaptureProps {
  pageType: AnalyticsPageType;
}

const AnalyticsClickCapture = ({ pageType }: AnalyticsClickCaptureProps) => {
  const pageTypeRef = useRef(pageType);

  useLayoutEffect(() => {
    pageTypeRef.current = pageType;
  }, [pageType]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const tracked = findTrackedElement(event.target);
      if (tracked) {
        trackEvent('ui_click', buildClickParams(tracked, pageTypeRef.current));
      }
    };

    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, []);

  return null;
};

export default AnalyticsClickCapture;
