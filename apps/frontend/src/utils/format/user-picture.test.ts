import { describe, expect, it } from 'vitest';
import { getAvatarPictureSource } from './user-picture';

const ORIGIN = 'https://hub.filigran.io';
const USER_ID = '89efc660-a732-4d71-abe2-455188be1505';
const LOCAL_PATH = `/user/picture/${USER_ID}`;
const STORED_PATH = `${LOCAL_PATH}?t=1760000000000`;
const AUTH0_URL = 'https://cdn.auth0.com/avatars/jd.png';
const GRAVATAR_URL = 'https://s.gravatar.com/avatar/538dc0e?s=480&r=pg';

// Candidates of a srcset such as "/_next/image?url=...&w=32&q=75 1x, /_next/image?...&w=48&q=75 2x".
const parseSrcSet = (srcSet: string | undefined) =>
  (srcSet ?? '').split(',').map((candidate) => {
    const [url, descriptor] = candidate.trim().split(' ');
    const optimiserUrl = new URL(url, ORIGIN);
    return {
      pathname: optimiserUrl.pathname,
      source: optimiserUrl.searchParams.get('url'),
      width: optimiserUrl.searchParams.get('w'),
      quality: optimiserUrl.searchParams.get('q'),
      descriptor,
    };
  });

// The local path the optimiser is asked for, or null when the picture is not offered to it.
const getOptimisedSource = (picture: string) => {
  const { srcSet } = getAvatarPictureSource(picture, 48);
  return srcSet ? parseSrcSet(srcSet)[0].source : null;
};

describe('getAvatarPictureSource', () => {
  describe('for a picture of the backend', () => {
    it.each([
      ['an absolute URL', `${ORIGIN}${STORED_PATH}`],
      ['a relative path', STORED_PATH],
      ['an http URL', `http://localhost:3002${STORED_PATH}`],
      [
        'a URL on another origin of the front',
        `https://staging.filigran.io${STORED_PATH}`,
      ],
      ['a URL without query', `${ORIGIN}${LOCAL_PATH}`],
      ['a URL with a fragment', `${ORIGIN}${STORED_PATH}#top`],
    ])(
      'should ask the optimiser for the path alone, without query, for %s',
      (_case, picture) => {
        // When / Then
        expect(getOptimisedSource(picture)).toBe(LOCAL_PATH);
      }
    );

    it('should never put the cache-buster in the optimiser URL', () => {
      // When
      const source = getAvatarPictureSource(`${ORIGIN}${STORED_PATH}`, 48);

      // Then
      expect(source.src).not.toContain('t%3D');
      expect(source.srcSet).not.toContain('t%3D');
      expect(source.srcSet).not.toContain('%3F');
    });

    it('should offer the optimiser the size and its retina twin', () => {
      // When
      const source = getAvatarPictureSource(`${ORIGIN}${STORED_PATH}`, 48);

      // Then
      expect(parseSrcSet(source.srcSet)).toEqual([
        {
          pathname: '/_next/image',
          source: LOCAL_PATH,
          width: '48',
          quality: '75',
          descriptor: '1x',
        },
        {
          pathname: '/_next/image',
          source: LOCAL_PATH,
          width: '96',
          quality: '75',
          descriptor: '2x',
        },
      ]);
    });

    it('should only use the sizes Next serves for a small avatar', () => {
      // When
      const source = getAvatarPictureSource(`${ORIGIN}${STORED_PATH}`, 24);

      // Then
      expect(parseSrcSet(source.srcSet).map(({ width }) => width)).toEqual([
        '32',
        '48',
      ]);
    });

    it('should use the retina candidate as the src', () => {
      // When
      const source = getAvatarPictureSource(`${ORIGIN}${STORED_PATH}`, 48);

      // Then
      const retinaCandidate = parseSrcSet(source.srcSet)[1];
      const srcUrl = new URL(source.src as string, ORIGIN);
      expect(srcUrl.pathname).toBe('/_next/image');
      expect(srcUrl.searchParams.get('url')).toBe(retinaCandidate.source);
      expect(srcUrl.searchParams.get('w')).toBe(retinaCandidate.width);
    });

    it('should keep the stored URL, cache-buster included, as the fallback', () => {
      // Given
      const stored = `${ORIGIN}${STORED_PATH}`;

      // When
      const source = getAvatarPictureSource(stored, 48);

      // Then
      expect(source.fallbackSrc).toBe(stored);
    });
  });

  describe('for a picture that is not a plain backend one', () => {
    it.each([
      ['an id that is not a UUID', `${ORIGIN}/user/picture/not-a-uuid?t=1`],
      [
        'an upper case UUID, another URL of the same picture',
        `${ORIGIN}/user/picture/${USER_ID.toUpperCase()}?t=1`,
      ],
      [
        'a UUID without hyphens, another URL of the same picture',
        `${ORIGIN}/user/picture/${USER_ID.replaceAll('-', '')}?t=1`,
      ],
      [
        'a UUID missing a character',
        `${ORIGIN}/user/picture/${USER_ID.slice(1)}?t=1`,
      ],
      [
        'a UUID with a character more',
        `${ORIGIN}/user/picture/0${USER_ID}?t=1`,
      ],
      ['a deeper path', `${ORIGIN}${LOCAL_PATH}/other?t=1`],
      ['a trailing slash', `${ORIGIN}${LOCAL_PATH}/?t=1`],
      ['another route', `${ORIGIN}/document/get/${USER_ID}?t=1`],
      [
        'another route that ends like the picture one',
        `${ORIGIN}/x${LOCAL_PATH}?t=1`,
      ],
      ['a path traversal', `${ORIGIN}/user/picture/../auth/${USER_ID}?t=1`],
      [
        'an encoded path traversal',
        `${ORIGIN}/user/picture/%2e%2e/auth/${USER_ID}`,
      ],
      ['an encoded slash', `${ORIGIN}${LOCAL_PATH}%2Fother?t=1`],
      ['an encoded UUID', `${ORIGIN}/user/picture/%38${USER_ID.slice(1)}?t=1`],
      ['a protocol-relative URL', `//evil.io${STORED_PATH}`],
      ['a backslash host', `/\\evil.io${STORED_PATH}`],
      ['user info', `https://user:secret@hub.filigran.io${STORED_PATH}`],
      ['a user name only', `https://user@hub.filigran.io${STORED_PATH}`],
      ['another query parameter', `${ORIGIN}${LOCAL_PATH}?x=1`],
      ['a cache-buster that is not a number', `${ORIGIN}${LOCAL_PATH}?t=abc`],
      ['a cache-buster with more parameters', `${ORIGIN}${LOCAL_PATH}?t=1&x=2`],
      ['another scheme', `ftp://hub.filigran.io${STORED_PATH}`],
      ['a blob URL', `blob:${ORIGIN}/${USER_ID}`],
      ['a data URL', 'data:image/png;base64,AAAA'],
      ['a javascript URL', `javascript:${LOCAL_PATH}`],
      ['an identity provider URL', AUTH0_URL],
      ['text that is not a URL', 'not a url'],
    ])(
      'should load %s as it is, never through the optimiser',
      (_case, picture) => {
        // When
        const source = getAvatarPictureSource(picture, 48);

        // Then
        expect(source).toEqual({ src: picture });
      }
    );

    it('should ask Gravatar for twice the size and load it as it is', () => {
      // When
      const source = getAvatarPictureSource(GRAVATAR_URL, 24);

      // Then
      expect(source).toEqual({
        src: 'https://s.gravatar.com/avatar/538dc0e?s=48&r=pg',
      });
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
  ])('should give nothing to load for %s', (_case, picture) => {
    // When / Then
    expect(getAvatarPictureSource(picture, 48)).toEqual({});
  });
});
