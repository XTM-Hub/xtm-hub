import {
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
} from '@/components/cookie-consent/cookie-consent.consts';
import { type ServiceConsent } from '@/components/cookie-consent/cookie-consent.types';
import {
  acceptAllConsent,
  getCookiePatternsToPurge,
  getDefaultConsent,
  getRevokedServices,
  isCategoryAllowed,
  isServiceAllowed,
  matchCookiePattern,
  needsConsent,
  normalizeConsent,
  parseStoredConsent,
  serializeConsent,
  setCategoryConsent,
} from '@/components/cookie-consent/cookie-consent.utils';
import { describe, expect, it } from 'vitest';

const allDenied: ServiceConsent = {
  'google-analytics': false,
  hubspot: false,
};

const allGranted: ServiceConsent = {
  'google-analytics': true,
  hubspot: true,
};

const now = new Date('2026-06-16T00:00:00.000Z');

describe('getDefaultConsent', () => {
  it('denies every service', () => {
    expect(getDefaultConsent()).toEqual(allDenied);
  });
});

describe('acceptAllConsent', () => {
  it('grants every service', () => {
    expect(acceptAllConsent()).toEqual(allGranted);
  });
});

describe('normalizeConsent', () => {
  it('drops unknown services and defaults missing ones to false', () => {
    expect(
      normalizeConsent({ 'google-analytics': true, unknown: true })
    ).toEqual({ 'google-analytics': true, hubspot: false });
  });
});

describe('isServiceAllowed', () => {
  it.each`
    serviceId             | expected
    ${'google-analytics'} | ${true}
    ${'hubspot'}          | ${false}
    ${'unknown'}          | ${false}
  `('returns $expected for "$serviceId"', ({ serviceId, expected }) => {
    expect(
      isServiceAllowed({ 'google-analytics': true, hubspot: false }, serviceId)
    ).toBe(expected);
  });
});

describe('isCategoryAllowed', () => {
  it.each`
    category       | consent       | expected
    ${'necessary'} | ${allDenied}  | ${true}
    ${'analytics'} | ${allGranted} | ${true}
    ${'analytics'} | ${allDenied}  | ${false}
    ${'marketing'} | ${allGranted} | ${true}
    ${'marketing'} | ${allDenied}  | ${false}
  `('returns $expected for "$category"', ({ category, consent, expected }) => {
    expect(isCategoryAllowed(consent, category)).toBe(expected);
  });
});

describe('setCategoryConsent', () => {
  it('sets every service in the category and leaves others untouched', () => {
    expect(setCategoryConsent(allDenied, 'analytics', true)).toEqual({
      'google-analytics': true,
      hubspot: false,
    });
    expect(setCategoryConsent(allGranted, 'marketing', false)).toEqual({
      'google-analytics': true,
      hubspot: false,
    });
  });
});

describe('getRevokedServices', () => {
  it('lists services that moved from granted to denied', () => {
    expect(getRevokedServices(allGranted, allDenied)).toEqual([
      'google-analytics',
      'hubspot',
    ]);
  });

  it('returns an empty array when nothing was revoked', () => {
    expect(getRevokedServices(allDenied, allGranted)).toEqual([]);
  });
});

describe('getCookiePatternsToPurge', () => {
  it.each`
    revoked                 | expected
    ${['google-analytics']} | ${['_ga', '_ga_*', '_gid', '_gat', '_gat_*', '_gcl_au', '_gac_*']}
    ${['hubspot']}          | ${['__hstc', '__hssc', '__hssrc', 'hubspotutk']}
    ${[]}                   | ${[]}
  `('collects cookies for $revoked', ({ revoked, expected }) => {
    expect(getCookiePatternsToPurge(revoked)).toEqual(expected);
  });
});

describe('matchCookiePattern', () => {
  it.each`
    cookieName      | pattern         | expected
    ${'_ga'}        | ${'_ga'}        | ${true}
    ${'_gid'}       | ${'_ga'}        | ${false}
    ${'_ga_ABC123'} | ${'_ga_*'}      | ${true}
    ${'_gat_ABC'}   | ${'_ga_*'}      | ${false}
    ${'hubspotutk'} | ${'hubspotutk'} | ${true}
  `(
    'matches "$cookieName" against "$pattern" as $expected',
    ({ cookieName, pattern, expected }) => {
      expect(matchCookiePattern(cookieName, pattern)).toBe(expected);
    }
  );
});

describe('parseStoredConsent', () => {
  it('returns null for null input', () => {
    expect(parseStoredConsent(null)).toBeNull();
  });

  it.each`
    raw                                                | description
    ${''}                                              | ${'empty string'}
    ${'not-json'}                                      | ${'invalid JSON'}
    ${'{}'}                                            | ${'no fields'}
    ${'{"version":"1","timestamp":"x","services":{}}'} | ${'version not a number'}
  `('returns null for $description', ({ raw }) => {
    expect(parseStoredConsent(raw)).toBeNull();
  });

  it('parses a valid payload and normalizes services', () => {
    const raw = JSON.stringify({
      version: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      services: { 'google-analytics': true, unknown: true },
    });
    expect(parseStoredConsent(raw)).toEqual({
      version: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      services: { 'google-analytics': true, hubspot: false },
    });
  });
});

describe('serializeConsent', () => {
  it('produces a payload that parseStoredConsent can read back', () => {
    const serialized = serializeConsent(allGranted, CONSENT_VERSION, now);
    expect(parseStoredConsent(serialized)).toEqual({
      version: CONSENT_VERSION,
      timestamp: now.toISOString(),
      services: allGranted,
    });
  });
});

describe('needsConsent', () => {
  it('requires consent when nothing is stored', () => {
    expect(needsConsent(null, now)).toBe(true);
  });

  it('requires consent when the stored version is outdated', () => {
    expect(
      needsConsent(
        {
          version: CONSENT_VERSION - 1,
          timestamp: now.toISOString(),
          services: allGranted,
        },
        now
      )
    ).toBe(true);
  });

  it.each`
    ageDays                     | expected | description
    ${CONSENT_MAX_AGE_DAYS - 1} | ${false} | ${'within the validity window'}
    ${CONSENT_MAX_AGE_DAYS + 1} | ${true}  | ${'past the validity window'}
  `(
    'returns $expected when consent is $description',
    ({ ageDays, expected }) => {
      const timestamp = new Date(
        now.getTime() - ageDays * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(
        needsConsent(
          { version: CONSENT_VERSION, timestamp, services: allGranted },
          now
        )
      ).toBe(expected);
    }
  );
});

describe('needsConsent with an unreadable timestamp', () => {
  it('requires consent when the stored timestamp is not a valid date', () => {
    // Given
    const stored = {
      version: CONSENT_VERSION,
      timestamp: 'not-a-date',
      services: allGranted,
    };

    // When
    const result = needsConsent(stored, now);

    // Then
    expect(result).toBe(true);
  });
});
