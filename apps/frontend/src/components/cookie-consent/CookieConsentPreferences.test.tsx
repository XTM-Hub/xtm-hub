import { readClientConsent } from '@/components/cookie-consent/cookie-consent.client';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_VERSION,
} from '@/components/cookie-consent/cookie-consent.consts';
import {
  type ServiceConsent,
  type StoredConsent,
} from '@/components/cookie-consent/cookie-consent.types';
import { getAllServices } from '@/components/cookie-consent/cookie-consent.utils';
import { CookieConsentPreferences } from '@/components/cookie-consent/CookieConsentPreferences';
import { CookieConsentProvider } from '@/components/cookie-consent/CookieConsentProvider';
import { CookieSettingsLink } from '@/components/cookie-consent/CookieSettingsLink';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date('2026-06-16T00:00:00.000Z');
const MARKETING_SWITCH = 'Categories.marketing.Title';
const GA_SERVICE = 'google-analytics';

const REGISTRY_SERVICES = getAllServices();

const consentForEveryService = (granted: boolean): ServiceConsent =>
  Object.fromEntries(REGISTRY_SERVICES.map(({ id }) => [id, granted]));

const ALL_GRANTED = consentForEveryService(true);
const ALL_DENIED = consentForEveryService(false);
const ONLY_GA_GRANTED = { ...ALL_DENIED, [GA_SERVICE]: true };

const makeStoredConsent = (services: ServiceConsent): StoredConsent => ({
  version: CONSENT_VERSION,
  timestamp: NOW.toISOString(),
  services,
});

const renderPreferences = (services: ServiceConsent) =>
  testRender(
    <CookieConsentProvider initialConsent={makeStoredConsent(services)}>
      <CookieSettingsLink />
      <CookieConsentPreferences />
    </CookieConsentProvider>
  );

const openPreferences = (user: UserEvent) =>
  user.click(screen.getByRole('button', { name: 'CookieSettingsLink' }));

const toggleServices = async (user: UserEvent) => {
  for (const button of screen.getAllByRole('button', {
    name: 'ManageServices',
  })) {
    await user.click(button);
  }
};

describe('CookieConsentPreferences', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
  });

  it.each`
    outcome    | granted                    | initialServices    | expectedServices
    ${'grant'} | ${'no service'}            | ${ALL_DENIED}      | ${ALL_GRANTED}
    ${'grant'} | ${'only Google Analytics'} | ${ONLY_GA_GRANTED} | ${ALL_GRANTED}
    ${'deny'}  | ${'every service'}         | ${ALL_GRANTED}     | ${ALL_DENIED}
  `(
    'should $outcome every service when the visitor flips the all-services switch with $granted granted',
    async ({ initialServices, expectedServices }) => {
      // Given
      const { user } = renderPreferences(initialServices);
      await openPreferences(user);

      // When
      await user.click(
        screen.getByRole('switch', { name: 'PreferenceForAllServices' })
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));

      // Then
      expect(readClientConsent()?.services).toEqual(expectedServices);
    }
  );

  it('should link each service to its privacy policy when the visitor expands the categories', async () => {
    // Given
    const { user } = renderPreferences(ALL_DENIED);
    await openPreferences(user);

    // When
    await toggleServices(user);

    // Then
    expect(
      screen
        .getAllByRole('link', { name: 'ReadMore' })
        .map((link) => link.getAttribute('href'))
    ).toEqual(REGISTRY_SERVICES.map(({ readMoreUrl }) => readMoreUrl));
  });

  it('should hide the services when the visitor collapses the categories', async () => {
    // Given
    const { user } = renderPreferences(ALL_DENIED);
    await openPreferences(user);
    await toggleServices(user);

    // When
    await toggleServices(user);

    // Then
    expect(
      REGISTRY_SERVICES.map(({ name }) =>
        screen.queryByRole('switch', { name })
      )
    ).toEqual(REGISTRY_SERVICES.map(() => null));
    expect(
      screen.getByRole('switch', { name: MARKETING_SWITCH })
    ).toBeInTheDocument();
  });

  it.each(REGISTRY_SERVICES)(
    'should save only $name when the visitor switches it on',
    async ({ id, name }) => {
      // Given
      const { user } = renderPreferences(ALL_DENIED);
      await openPreferences(user);
      await toggleServices(user);

      // When
      await user.click(screen.getByRole('switch', { name }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      // Then
      expect(readClientConsent()?.services).toEqual({
        ...ALL_DENIED,
        [id]: true,
      });
    }
  );

  it('should discard unsaved changes when the visitor reopens the preferences', async () => {
    // Given
    const { user } = renderPreferences(ALL_GRANTED);
    await openPreferences(user);
    await user.click(screen.getByRole('switch', { name: MARKETING_SWITCH }));
    await user.keyboard('{Escape}');

    // When
    await openPreferences(user);

    // Then
    expect(
      screen.getByRole('switch', { name: MARKETING_SWITCH })
    ).toBeChecked();
  });
});
