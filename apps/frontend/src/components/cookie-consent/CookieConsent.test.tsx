import { readClientConsent } from '@/components/cookie-consent/cookie-consent.client';
import { CONSENT_VERSION } from '@/components/cookie-consent/cookie-consent.consts';
import { CookieConsent } from '@/components/cookie-consent/CookieConsent';
import { CookieConsentProvider } from '@/components/cookie-consent/CookieConsentProvider';
import { CookieSettingsLink } from '@/components/cookie-consent/CookieSettingsLink';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date('2026-06-16T00:00:00.000Z');
const HUBSPOT_COOKIE = 'hubspotutk';
const GA_COOKIE = '_ga';

const clearAllCookies = () => {
  document.cookie
    .split('; ')
    .map((entry) => entry.split('=')[0])
    .filter((name): name is string => !!name)
    .forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0`;
    });
};

const renderCookieConsent = (segment: string) => {
  vi.mocked(useSelectedLayoutSegment).mockReturnValue(segment);
  return testRender(
    <CookieConsentProvider initialConsent={null}>
      <CookieConsent />
    </CookieConsentProvider>
  );
};

describe('CookieConsent', () => {
  beforeEach(() => {
    // Only Date is faked: the consent expiry is computed from the clock, but
    // user-event still needs the real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    clearAllCookies();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearAllCookies();
  });

  it.each`
    segment
    ${'(application)'}
    ${'(public)'}
    ${'login'}
  `(
    'should display the consent banner when the layout segment is "$segment"',
    ({ segment }) => {
      // Given / When
      renderCookieConsent(segment);

      // Then
      expect(screen.getByRole('region', { name: 'Title' })).toBeInTheDocument();
    }
  );

  it('should not display anything when the layout segment is "(embed)"', () => {
    // Given / When
    renderCookieConsent('(embed)');

    // Then
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('should open the preferences dialog when the user clicks the cookie settings button', async () => {
    // Given
    const { user } = renderCookieConsent('(application)');

    // When
    await user.click(screen.getByRole('button', { name: 'CookieSettings' }));

    // Then
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close the preferences dialog without saving when the user dismisses it', async () => {
    // Given
    const { user } = renderCookieConsent('(application)');
    await user.click(screen.getByRole('button', { name: 'CookieSettings' }));

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readClientConsent()).toBeNull();
  });

  it('should revoke marketing, purge its cookies and keep analytics when the user disables marketing and saves', async () => {
    // Given a returning user who granted everything and reopens the settings
    document.cookie = `${GA_COOKIE}=1; path=/`;
    document.cookie = `${HUBSPOT_COOKIE}=1; path=/`;
    vi.mocked(useSelectedLayoutSegment).mockReturnValue('(application)');
    const { user } = testRender(
      <CookieConsentProvider
        initialConsent={{
          version: CONSENT_VERSION,
          timestamp: NOW.toISOString(),
          services: { 'google-analytics': true, hubspot: true },
        }}>
        <CookieConsent />
        <CookieSettingsLink />
      </CookieConsentProvider>
    );
    await user.click(
      screen.getByRole('button', { name: 'CookieSettingsLink' })
    );

    // When
    await user.click(
      screen.getByRole('switch', { name: 'Categories.marketing.Title' })
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Then
    expect(readClientConsent()?.services).toEqual({
      'google-analytics': true,
      hubspot: false,
    });
    expect(document.cookie).not.toContain(HUBSPOT_COOKIE);
    expect(document.cookie).toContain(`${GA_COOKIE}=1`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
