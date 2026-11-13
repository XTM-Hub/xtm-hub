import { describe, expect, it } from 'vitest';
import { getAvatarPictureSource, getBackendPicturePath } from './user-picture';

const ORIGIN = 'https://hub.filigran.io';
const USER_ID = '89efc660-a732-4d71-abe2-455188be1505';
const PICTURE_PATH = `/user/picture/${USER_ID}?t=1760000000000`;
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

describe('getBackendPicturePath', () => {
  it.each([
    ['an absolute URL', `${ORIGIN}${PICTURE_PATH}`],
    ['a relative path', PICTURE_PATH],
    ['an http URL', `http://localhost:3002${PICTURE_PATH}`],
    [
      'a URL on another origin of the front',
      `https://staging.filigran.io${PICTURE_PATH}`,
    ],
  ])(
    'should return the local path and the cache-buster of %s',
    (_case, src) => {
      // When / Then
      expect(getBackendPicturePath(src)).toBe(PICTURE_PATH);
    }
  );

  it('should return the path alone when the URL has no query', () => {
    // When / Then
    expect(getBackendPicturePath(`${ORIGIN}/user/picture/${USER_ID}`)).toBe(
      `/user/picture/${USER_ID}`
    );
  });

  it('should drop the fragment of the URL', () => {
    // When / Then
    expect(getBackendPicturePath(`${ORIGIN}${PICTURE_PATH}#top`)).toBe(
      PICTURE_PATH
    );
  });

  it('should accept an upper case UUID', () => {
    // Given
    const path = `/user/picture/${USER_ID.toUpperCase()}?t=1`;

    // When / Then
    expect(getBackendPicturePath(`${ORIGIN}${path}`)).toBe(path);
  });

  it.each([
    ['an id that is not a UUID', `${ORIGIN}/user/picture/not-a-uuid?t=1`],
    [
      'a UUID missing a character',
      `${ORIGIN}/user/picture/${USER_ID.slice(1)}?t=1`,
    ],
    ['a UUID with a character more', `${ORIGIN}/user/picture/0${USER_ID}?t=1`],
    ['a deeper path', `${ORIGIN}/user/picture/${USER_ID}/other?t=1`],
    ['a trailing slash', `${ORIGIN}/user/picture/${USER_ID}/?t=1`],
    ['another route', `${ORIGIN}/document/get/${USER_ID}?t=1`],
    [
      'another route that ends like the picture one',
      `${ORIGIN}/x/user/picture/${USER_ID}?t=1`,
    ],
    ['a path traversal', `${ORIGIN}/user/picture/../auth/${USER_ID}?t=1`],
    [
      'an encoded path traversal',
      `${ORIGIN}/user/picture/%2e%2e/auth/${USER_ID}`,
    ],
    ['an encoded slash', `${ORIGIN}/user/picture/${USER_ID}%2Fother?t=1`],
    ['an encoded UUID', `${ORIGIN}/user/picture/%38${USER_ID.slice(1)}?t=1`],
    ['a protocol-relative URL', `//evil.io/user/picture/${USER_ID}?t=1`],
    ['a backslash host', `/\\evil.io/user/picture/${USER_ID}?t=1`],
    [
      'user info',
      `https://user:secret@hub.filigran.io/user/picture/${USER_ID}?t=1`,
    ],
    [
      'a user name only',
      `https://user@hub.filigran.io/user/picture/${USER_ID}?t=1`,
    ],
    ['another query parameter', `${ORIGIN}/user/picture/${USER_ID}?x=1`],
    [
      'a cache-buster that is not a number',
      `${ORIGIN}/user/picture/${USER_ID}?t=abc`,
    ],
    [
      'a cache-buster with more parameters',
      `${ORIGIN}/user/picture/${USER_ID}?t=1&x=2`,
    ],
    ['another scheme', `ftp://hub.filigran.io/user/picture/${USER_ID}?t=1`],
    ['a blob URL', `blob:${ORIGIN}/${USER_ID}`],
    ['a data URL', 'data:image/png;base64,AAAA'],
    ['a javascript URL', `javascript:/user/picture/${USER_ID}`],
    ['a Gravatar URL', GRAVATAR_URL],
    ['an identity provider URL', AUTH0_URL],
    ['an empty string', ''],
    ['text that is not a URL', 'not a url'],
  ])('should return null for %s', (_case, src) => {
    // When / Then
    expect(getBackendPicturePath(src)).toBeNull();
  });
});

describe('getAvatarPictureSource', () => {
  it('should offer a backend picture to the optimiser at the size and its retina twin', () => {
    // When
    const source = getAvatarPictureSource(`${ORIGIN}${PICTURE_PATH}`, 48);

    // Then
    expect(parseSrcSet(source.srcSet)).toEqual([
      {
        pathname: '/_next/image',
        source: PICTURE_PATH,
        width: '48',
        quality: '75',
        descriptor: '1x',
      },
      {
        pathname: '/_next/image',
        source: PICTURE_PATH,
        width: '96',
        quality: '75',
        descriptor: '2x',
      },
    ]);
  });

  it('should only use the sizes Next serves for a small avatar', () => {
    // When
    const source = getAvatarPictureSource(`${ORIGIN}${PICTURE_PATH}`, 24);

    // Then
    expect(parseSrcSet(source.srcSet).map(({ width }) => width)).toEqual([
      '32',
      '48',
    ]);
  });

  it('should use the retina candidate as the src of a backend picture', () => {
    // When
    const source = getAvatarPictureSource(`${ORIGIN}${PICTURE_PATH}`, 48);

    // Then
    const retinaCandidate = parseSrcSet(source.srcSet)[1];
    const srcUrl = new URL(source.src as string, ORIGIN);
    expect(srcUrl.pathname).toBe('/_next/image');
    expect(srcUrl.searchParams.get('url')).toBe(retinaCandidate.source);
    expect(srcUrl.searchParams.get('w')).toBe(retinaCandidate.width);
  });

  it('should keep the stored URL of a backend picture as its fallback', () => {
    // Given
    const stored = `${ORIGIN}${PICTURE_PATH}`;

    // When
    const source = getAvatarPictureSource(stored, 48);

    // Then
    expect(source.fallbackSrc).toBe(stored);
    expect(source.sizes).toBeUndefined();
  });

  it('should ask Gravatar for twice the size and load it as it is', () => {
    // When
    const source = getAvatarPictureSource(GRAVATAR_URL, 24);

    // Then
    expect(source).toEqual({
      src: 'https://s.gravatar.com/avatar/538dc0e?s=48&r=pg',
    });
  });

  it.each([
    ['an identity provider host', AUTH0_URL],
    ['a blob preview', 'blob:https://hub.filigran.io/1234'],
    ['a data preview', 'data:image/png;base64,AAAA'],
    [
      'a picture of the route with an id that is not a UUID',
      `${ORIGIN}/user/picture/not-a-uuid?t=1`,
    ],
    ['a path traversal', `${ORIGIN}/user/picture/../auth/login`],
  ])('should load %s as it is', (_case, picture) => {
    // When
    const source = getAvatarPictureSource(picture, 48);

    // Then
    expect(source).toEqual({ src: picture });
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
