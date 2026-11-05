'use client';

import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { ConsentGate } from '@/components/cookie-consent/ConsentGate';
import { EMBED_SEGMENT } from '@/components/cookie-consent/cookie-consent.consts';
import Hubspot from '@/components/external/Hubspot';
import { GA_CONSENT_SERVICE_ID } from '@/lib/analytics/analytics.consts';
import { useSelectedLayoutSegment } from 'next/navigation';

interface ManagedScriptsProps {
  gaMeasurementId?: string;
}

export const ManagedScripts = ({ gaMeasurementId }: ManagedScriptsProps) => {
  const isEmbedded = useSelectedLayoutSegment() === EMBED_SEGMENT;
  return (
    <>
      {gaMeasurementId && !isEmbedded && (
        <ConsentGate service={GA_CONSENT_SERVICE_ID}>
          <AnalyticsTracker measurementId={gaMeasurementId} />
        </ConsentGate>
      )}
      <ConsentGate service="hubspot">
        <Hubspot />
      </ConsentGate>
    </>
  );
};
