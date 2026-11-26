import {
  purgeCookies,
  readClientConsent,
  writeClientConsent,
} from '@/components/cookie-consent/cookie-consent.client';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
} from '@/components/cookie-consent/cookie-consent.consts';
import { type ServiceConsent } from '@/components/cookie-consent/cookie-consent.types';
import { serializeConsent } from '@/components/cookie-consent/cookie-consent.utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const GA_SERVICE = 'google-analytics';
const HUBSPOT_SERVICE = 'hubspot';
const SECONDS_IN_DAY = 24 * 60 * 60;

const allGranted: ServiceConsent = {
  [GA_SERVICE]: true,
  [HUBSPOT_SERVICE]: true,
};

const clearAllCookies = () => {
  document.cookie
    .split('; ')
    .map((entry) => entry.split('=')[0])
    .filter((name): name is string => !!name)
    .forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0`;
    });
};

const stubLocation = (location: { protocol: string; hostname: string }) => {
  vi.stubGlobal('location', location);
};

describe('cookie-consent.client', () => {
  beforeEach(() => {
    clearAllCookies();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearAllCookies();
  });

  describe('readClientConsent', () => {
    it('should return null when no consent cookie exists', () => {
      // Given
      document.cookie = 'other=value; path=/';

      // When
      const consent = readClientConsent();

      // Then
      expect(consent).toBeNull();
    });

    it('should return the stored consent when a valid cookie exists', () => {
      // Given
      document.cookie = 'unrelated=1; path=/';
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
        serializeConsent(allGranted)
      )}; path=/`;

      // When
      const consent = readClientConsent();

      // Then
      expect(consent?.services).toEqual(allGranted);
    });

    it('should return null when the consent cookie is malformed', () => {
      // Given
      document.cookie = `${CONSENT_COOKIE_NAME}=not-json; path=/`;

      // When
      const consent = readClientConsent();

      // Then
      expect(consent).toBeNull();
    });
  });

  describe('writeClientConsent', () => {
    it('should persist the consent so that it can be read back', () => {
      // Given
      const services: ServiceConsent = {
        [GA_SERVICE]: true,
        [HUBSPOT_SERVICE]: false,
      };

      // When
      const written = writeClientConsent(services);

      // Then
      expect(readClientConsent()).toEqual(written);
      expect(written).toMatchObject({ version: CONSENT_VERSION, services });
    });

    it('should ignore unknown services', () => {
      // Given
      const services: ServiceConsent = { ...allGranted, unknown: true };

      // When
      const written = writeClientConsent(services);

      // Then
      expect(written.services).toEqual(allGranted);
    });

    it.each`
      protocol    | expectSecure
      ${'http:'}  | ${false}
      ${'https:'} | ${true}
    `(
      'should set the secure attribute to $expectSecure when the protocol is $protocol',
      ({ protocol, expectSecure }) => {
        // Given
        stubLocation({ protocol, hostname: 'localhost' });
        const cookieSetter = vi.spyOn(document, 'cookie', 'set');

        // When
        writeClientConsent(allGranted);

        // Then
        const attributes = String(cookieSetter.mock.calls[0]?.[0]).split('; ');
        expect(attributes.includes('secure')).toBe(expectSecure);
        expect(attributes).toContain(
          `max-age=${CONSENT_MAX_AGE_DAYS * SECONDS_IN_DAY}`
        );
      }
    );
  });

  describe('purgeCookies', () => {
    it('should remove cookies matching an exact name or a wildcard pattern', () => {
      // Given
      document.cookie = '_ga=1; path=/';
      document.cookie = '_ga_ABC123=1; path=/';
      document.cookie = 'session=1; path=/';

      // When
      purgeCookies(['_ga', '_ga_*']);

      // Then
      expect(document.cookie).toBe('session=1');
    });

    it('should keep every cookie when there is no pattern to purge', () => {
      // Given
      document.cookie = '_ga=1; path=/';

      // When
      purgeCookies([]);

      // Then
      expect(document.cookie).toBe('_ga=1');
    });

    it('should keep cookies that match no pattern', () => {
      // Given
      document.cookie = '_gid=1; path=/';

      // When
      purgeCookies(['_ga']);

      // Then
      expect(document.cookie).toBe('_gid=1');
    });

    it.each`
      hostname               | expectedDomains
      ${'localhost'}         | ${[]}
      ${'filigran.io'}       | ${[]}
      ${'hub.filigran.io'}   | ${['.filigran.io']}
      ${'a.hub.filigran.io'} | ${['.filigran.io']}
    `(
      'should expire the cookie on the domains $expectedDomains when the hostname is $hostname',
      ({ hostname, expectedDomains }) => {
        // Given
        document.cookie = '_ga=1; path=/';
        stubLocation({ protocol: 'https:', hostname });
        const cookieSetter = vi.spyOn(document, 'cookie', 'set');

        // When
        purgeCookies(['_ga']);

        // Then
        const writes = cookieSetter.mock.calls.map(([value]) => String(value));
        const domainScopedWrites = writes.filter((write) =>
          write.includes('domain=')
        );
        expect(writes).toContain('_ga=; path=/; max-age=0');
        expect(domainScopedWrites).toEqual(
          expectedDomains.map(
            (domain: string) => `_ga=; path=/; max-age=0; domain=${domain}`
          )
        );
      }
    );
  });
});
