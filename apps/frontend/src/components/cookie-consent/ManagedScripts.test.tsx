import { CONSENT_VERSION } from '@/components/cookie-consent/cookie-consent.consts';
import { CookieConsentProvider } from '@/components/cookie-consent/CookieConsentProvider';
import { ManagedScripts } from '@/components/cookie-consent/ManagedScripts';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Google Analytics and HubSpot load third-party code: stub them at that boundary.
vi.mock('@/components/analytics/AnalyticsTracker', () => ({
  default: () => <div data-testid="google-analytics-script" />,
}));
vi.mock('@/components/external/Hubspot', () => ({
  default: () => <div data-testid="hubspot-script" />,
}));

const NOW = new Date('2026-06-16T00:00:00.000Z');
const MEASUREMENT_ID = 'G-TEST';

const renderManagedScripts = (
  services: Record<string, boolean>,
  { gaMeasurementId }: { gaMeasurementId?: string } = {
    gaMeasurementId: MEASUREMENT_ID,
  }
) =>
  testRender(
    <CookieConsentProvider
      initialConsent={{
        version: CONSENT_VERSION,
        timestamp: NOW.toISOString(),
        services,
      }}>
      <ManagedScripts gaMeasurementId={gaMeasurementId} />
    </CookieConsentProvider>
  );

describe('ManagedScripts', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each`
    services                                         | gaLoaded | hubspotLoaded
    ${{ 'google-analytics': false, hubspot: false }} | ${false} | ${false}
    ${{ 'google-analytics': true, hubspot: false }}  | ${true}  | ${false}
    ${{ 'google-analytics': false, hubspot: true }}  | ${false} | ${true}
    ${{ 'google-analytics': true, hubspot: true }}   | ${true}  | ${true}
  `(
    'should load Google Analytics: $gaLoaded and HubSpot: $hubspotLoaded when consent is $services',
    ({ services, gaLoaded, hubspotLoaded }) => {
      // Given / When
      renderManagedScripts(services);

      // Then
      expect(!!screen.queryByTestId('google-analytics-script')).toBe(gaLoaded);
      expect(!!screen.queryByTestId('hubspot-script')).toBe(hubspotLoaded);
    }
  );

  it('should not load Google Analytics when the page is embedded', () => {
    // Given
    vi.mocked(useSelectedLayoutSegment).mockReturnValue('(embed)');

    // When
    renderManagedScripts({ 'google-analytics': true, hubspot: false });

    // Then
    expect(screen.queryByTestId('google-analytics-script')).toBeNull();
  });

  it('should not load Google Analytics when no measurement id is configured', () => {
    // Given / When
    renderManagedScripts(
      { 'google-analytics': true, hubspot: false },
      { gaMeasurementId: undefined }
    );

    // Then
    expect(screen.queryByTestId('google-analytics-script')).toBeNull();
  });
});
