import { publicLocales } from '@/i18n/config';
import { headers } from 'next/headers';
import { describe, expect, it, vi } from 'vitest';

import robots from './robots';

const PRODUCTION_DOMAIN = 'hub.filigran.io';
const SITEMAP_URL = 'https://hub.filigran.io/sitemap.xml';

const givenHost = (host: string | null) => {
  vi.mocked(headers).mockResolvedValue(
    new Headers(host === null ? {} : { host })
  );
};

const asArray = (value: string | string[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const getSingleRule = async () => {
  const { rules } = await robots();
  return Array.isArray(rules) ? rules[0] : rules;
};

describe('robots', () => {
  it('should disallow null document slugs for every public locale when the domain is production', async () => {
    givenHost(PRODUCTION_DOMAIN);

    const rule = await getSingleRule();

    expect(asArray(rule.disallow)).toEqual(
      expect.arrayContaining(
        publicLocales.map(
          (locale) => `/${locale}/cybersecurity-solutions/*/null$`
        )
      )
    );
  });

  it('should still disallow everything by default when the domain is production', async () => {
    givenHost(PRODUCTION_DOMAIN);

    const rule = await getSingleRule();

    expect(asArray(rule.disallow)).toContain('/');
  });

  it('should keep the existing allow rules unchanged when the domain is production', async () => {
    givenHost(PRODUCTION_DOMAIN);

    const rule = await getSingleRule();

    expect(asArray(rule.allow)).toEqual([
      '/sitemap.xml',
      '/login',
      '/favicon.ico',
      '/apple-icon.png',
      '/favicon-*.png',
      '/_next/static/',
      '/_next/image',
      '/_next/data/',
      '/en$',
      '/en/$',
      '/fr$',
      '/fr/$',
      '/ja$',
      '/ja/$',
      '/en/cybersecurity-solutions',
      '/en/cybersecurity-solutions/',
      '/en/cybersecurity-solutions/*',
      '/fr/cybersecurity-solutions',
      '/fr/cybersecurity-solutions/',
      '/fr/cybersecurity-solutions/*',
      '/ja/cybersecurity-solutions',
      '/ja/cybersecurity-solutions/',
      '/ja/cybersecurity-solutions/*',
      '/document/images/*',
    ]);
  });

  it('should keep the sitemap when the domain is production', async () => {
    givenHost(PRODUCTION_DOMAIN);

    const { sitemap } = await robots();

    expect(sitemap).toBe(SITEMAP_URL);
  });

  it.each([['hub.prerelease.filigran.io'], ['localhost:3002'], [''], [null]])(
    'should only disallow everything when the host is %s',
    async (host) => {
      givenHost(host);

      const { rules, sitemap } = await robots();

      expect(rules).toEqual({ userAgent: '*', disallow: '/' });
      expect(sitemap).toBeUndefined();
    }
  );
});
