import { describe, expect, it } from 'vitest';
import {
  buildAlternates,
  buildSeoPageMetadata,
  stringifyJsonLd,
} from './generate-metadata';

describe('stringifyJsonLd', () => {
  it.each`
    data                                     | expected                                              | description
    ${{ name: 'Filigran' }}                  | ${'{"name":"Filigran"}'}                              | ${'plain object without special characters'}
    ${{ name: '</script><script>alert(1)' }} | ${'{"name":"\\u003c/script>\\u003cscript>alert(1)"}'} | ${'escapes every `<` to prevent early script tag closing'}
  `('stringifies $description', ({ data, expected }) => {
    expect(stringifyJsonLd(data)).toBe(expected);
  });
});

describe('buildAlternates', () => {
  it('builds canonical and per-locale language links, including x-default', () => {
    const alternates = buildAlternates('/cybersecurity-solutions/foo', 'ja');

    expect(alternates).toEqual({
      canonical: '/ja/cybersecurity-solutions/foo',
      languages: {
        en: '/en/cybersecurity-solutions/foo',
        fr: '/fr/cybersecurity-solutions/foo',
        ja: '/ja/cybersecurity-solutions/foo',
        'x-default': '/en/cybersecurity-solutions/foo',
      },
    });
  });

  it('does not append a trailing path segment for the root pathname', () => {
    const alternates = buildAlternates('/', 'en');

    expect(alternates.canonical).toBe('/en');
    expect(alternates.languages).toMatchObject({ 'x-default': '/en' });
  });
});

describe('buildSeoPageMetadata', () => {
  const baseParams = {
    baseUrl: 'https://hub.filigran.io',
    locale: 'en' as const,
    pathname: '/cybersecurity-solutions/foo',
    title: 'Title',
    description: 'Description',
    imageAlt: 'Alt text',
  };

  it('falls back to seo_default.png when no imageUrl is provided', () => {
    const metadata = buildSeoPageMetadata(baseParams);

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: 'https://hub.filigran.io/seo_default.png',
      }),
    ]);
    expect(metadata.twitter?.images).toEqual([
      'https://hub.filigran.io/seo_default.png',
    ]);
  });

  it('uses the provided imageUrl when set', () => {
    const metadata = buildSeoPageMetadata({
      ...baseParams,
      imageUrl: 'https://hub.filigran.io/document/images/1/2',
    });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: 'https://hub.filigran.io/document/images/1/2',
      }),
    ]);
  });

  it.each([
    [undefined, 'website'],
    ['article' as const, 'article'],
  ])('sets openGraph type to %s when type is %s', (type, expectedType) => {
    const metadata = buildSeoPageMetadata({ ...baseParams, type });

    expect(metadata.openGraph?.type).toBe(expectedType);
  });

  it('sets locale and alternateLocale based on the current locale', () => {
    const metadata = buildSeoPageMetadata({ ...baseParams, locale: 'ja' });

    expect(metadata.openGraph).toMatchObject({
      locale: 'ja_JP',
      alternateLocale: ['en_US', 'fr_FR'],
    });
  });
});
