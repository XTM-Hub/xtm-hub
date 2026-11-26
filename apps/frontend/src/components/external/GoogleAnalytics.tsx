'use client';

import Script from 'next/script';

interface GoogleAnalyticsProps {
  measurementId: string;
}

const GoogleAnalytics = ({ measurementId }: GoogleAnalyticsProps) => (
  <Script
    strategy="afterInteractive"
    src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
  />
);

export default GoogleAnalytics;
