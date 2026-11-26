import { ConsentGate } from '@/components/cookie-consent/ConsentGate';
import { readClientConsent } from '@/components/cookie-consent/cookie-consent.client';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_VERSION,
} from '@/components/cookie-consent/cookie-consent.consts';
import {
  type ServiceConsent,
  type StoredConsent,
} from '@/components/cookie-consent/cookie-consent.types';
import { CookieConsent } from '@/components/cookie-consent/CookieConsent';
import {
  CookieConsentProvider,
  useConsent,
} from '@/components/cookie-consent/CookieConsentProvider';
import { initializeAnalytics } from '@/lib/analytics/analytics.client';
import { resetAnalyticsEnvironment } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { act, renderHook, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date('2026-06-16T00:00:00.000Z');
const MEASUREMENT_ID = 'G-TEST';
const GA_SERVICE = 'google-analytics';
const HUBSPOT_SERVICE = 'hubspot';
const GA_COOKIE = '_ga';
const HUBSPOT_COOKIE = 'hubspotutk';
const GATED_CONTENT = 'gated content';

const allGranted: ServiceConsent = {
  [GA_SERVICE]: true,
  [HUBSPOT_SERVICE]: true,
};

const allDenied: ServiceConsent = {
  [GA_SERVICE]: false,
  [HUBSPOT_SERVICE]: false,
};

const makeStoredConsent = (
  services: ServiceConsent,
  overrides?: Partial<StoredConsent>
): StoredConsent => ({
  version: CONSENT_VERSION,
  timestamp: NOW.toISOString(),
  services,
  ...overrides,
});

const clearAllCookies = () => {
  document.cookie
    .split('; ')
    .map((entry) => entry.split('=')[0])
    .filter((name): name is string => !!name)
    .forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0`;
    });
};

const renderConsent = (initialConsent: StoredConsent | null) =>
  testRender(
    <CookieConsentProvider initialConsent={initialConsent}>
      <CookieConsent />
      <ConsentGate service={GA_SERVICE}>
        <span>{GATED_CONTENT}</span>
      </ConsentGate>
    </CookieConsentProvider>
  );

const outdatedConsent = (services: ServiceConsent) =>
  makeStoredConsent(services, { version: CONSENT_VERSION - 1 });

const getBanner = () => screen.queryByRole('region', { name: 'Title' });

describe('CookieConsentProvider', () => {
  beforeEach(() => {
    // Only Date is faked: the consent expiry is computed from the clock, but
    // user-event still needs the real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    clearAllCookies();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllCookies();
  });

  describe('initial state', () => {
    it('should show the banner and gate the services when no consent is stored', () => {
      // Given / When
      renderConsent(null);

      // Then
      expect(getBanner()).toBeInTheDocument();
      expect(screen.queryByText(GATED_CONTENT)).not.toBeInTheDocument();
    });

    it('should hide the banner and open the gated services when a valid consent is stored', () => {
      // Given / When
      renderConsent(makeStoredConsent(allGranted));

      // Then
      expect(getBanner()).not.toBeInTheDocument();
      expect(screen.getByText(GATED_CONTENT)).toBeInTheDocument();
    });

    it('should show the banner when the stored consent has an outdated version', () => {
      // Given / When
      renderConsent(outdatedConsent(allGranted));

      // Then
      expect(getBanner()).toBeInTheDocument();
    });

    it('should keep the gated services closed when the stored consent has an outdated version', () => {
      // Given / When
      renderConsent(outdatedConsent(allGranted));

      // Then
      expect(screen.queryByText(GATED_CONTENT)).not.toBeInTheDocument();
    });
  });

  describe('accepting and rejecting', () => {
    it('should hide the banner, open the gated services and persist the choice when accepting all', async () => {
      // Given
      const { user } = renderConsent(null);

      // When
      await user.click(screen.getByRole('button', { name: 'AcceptAll' }));

      // Then
      expect(getBanner()).not.toBeInTheDocument();
      expect(screen.getByText(GATED_CONTENT)).toBeInTheDocument();
      expect(readClientConsent()?.services).toEqual(allGranted);
    });

    it('should hide the banner, keep the gated services closed and persist the choice when rejecting all', async () => {
      // Given
      const { user } = renderConsent(null);

      // When
      await user.click(screen.getByRole('button', { name: 'RejectAll' }));

      // Then
      expect(getBanner()).not.toBeInTheDocument();
      expect(screen.queryByText(GATED_CONTENT)).not.toBeInTheDocument();
      expect(readClientConsent()?.services).toEqual(allDenied);
    });
  });

  describe('revoking consent', () => {
    it('should purge every service cookie when rejecting all after a full consent', async () => {
      // Given
      document.cookie = `${GA_COOKIE}=1; path=/`;
      document.cookie = `${HUBSPOT_COOKIE}=1; path=/`;
      document.cookie = 'session=1; path=/';
      const { user } = renderConsent(outdatedConsent(allGranted));

      // When
      await user.click(screen.getByRole('button', { name: 'RejectAll' }));

      // Then
      expect(document.cookie).not.toContain(GA_COOKIE);
      expect(document.cookie).not.toContain(HUBSPOT_COOKIE);
      expect(document.cookie).toContain('session=1');
      expect(document.cookie).toContain(CONSENT_COOKIE_NAME);
    });

    it('should keep the service cookies when no service is revoked', async () => {
      // Given
      document.cookie = `${GA_COOKIE}=1; path=/`;
      const { user } = renderConsent(outdatedConsent(allDenied));

      // When
      await user.click(screen.getByRole('button', { name: 'AcceptAll' }));

      // Then
      expect(document.cookie).toContain(`${GA_COOKIE}=1`);
    });
  });

  describe('withdrawing analytics consent', () => {
    const consentWrapper = ({ children }: { children: ReactNode }) => (
      <CookieConsentProvider initialConsent={makeStoredConsent(allGranted)}>
        {children}
      </CookieConsentProvider>
    );

    beforeEach(() => {
      resetAnalyticsEnvironment();
      initializeAnalytics(MEASUREMENT_ID);
    });

    it.each([
      ['disable', { [GA_SERVICE]: false, [HUBSPOT_SERVICE]: true }, true],
      ['keep', { [GA_SERVICE]: true, [HUBSPOT_SERVICE]: false }, false],
    ])(
      'should %s the measurement when the saved consent is %j',
      (_outcome, services, isDisabled) => {
        // Given
        const { result } = renderHook(() => useConsent(), {
          wrapper: consentWrapper,
        });

        // When
        act(() => result.current.save(services));

        // Then
        expect(window[`ga-disable-${MEASUREMENT_ID}`]).toBe(isDisabled);
      }
    );
  });

  describe('useConsent', () => {
    it('should throw when used outside of a CookieConsentProvider', () => {
      // Given
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const OrphanConsumer = () => {
        useConsent();
        return null;
      };

      // When / Then
      expect(() => testRender(<OrphanConsumer />)).toThrow(
        'useConsent must be used within a CookieConsentProvider'
      );
    });
  });
});
