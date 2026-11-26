import { ConsentGate } from '@/components/cookie-consent/ConsentGate';
import { CONSENT_VERSION } from '@/components/cookie-consent/cookie-consent.consts';
import { CookieConsentProvider } from '@/components/cookie-consent/CookieConsentProvider';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const GATED_CONTENT = 'gated content';

const renderGate = (service: string, grantedServices: string[]) =>
  testRender(
    <CookieConsentProvider
      initialConsent={{
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        services: Object.fromEntries(
          grantedServices.map((granted) => [granted, true])
        ),
      }}>
      <ConsentGate service={service}>
        <span>{GATED_CONTENT}</span>
      </ConsentGate>
    </CookieConsentProvider>
  );

describe('ConsentGate', () => {
  it.each`
    service               | granted                 | expectedVisible
    ${'google-analytics'} | ${['google-analytics']} | ${true}
    ${'hubspot'}          | ${['google-analytics']} | ${false}
    ${'google-analytics'} | ${[]}                   | ${false}
    ${'unknown-service'}  | ${['google-analytics']} | ${false}
  `(
    'should render the children: $expectedVisible when "$service" is gated and $granted are granted',
    ({ service, granted, expectedVisible }) => {
      // Given / When
      renderGate(service, granted);

      // Then
      expect(!!screen.queryByText(GATED_CONTENT)).toBe(expectedVisible);
    }
  );
});
