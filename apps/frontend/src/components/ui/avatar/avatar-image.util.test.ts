import { describe, expect, it } from 'vitest';
import {
  getBackendPicturePath,
  getGravatarSizedUrl,
  resolveAvatarImage,
} from './avatar-image.util';

const ORIGIN = 'https://hub.filigran.io';
const USER_ID = '89efc660-a732-4d71-abe2-455188be1505';
const PICTURE_PATH = `/user/picture/${USER_ID}?t=1760000000000`;
const GRAVATAR_HASH = '538dc0e5c6e4b1d4f0b1e3a4c7d8f9a0';
const AUTH0_URL = 'https://cdn.auth0.com/avatars/jd.png';

const sizeOf = (url: string) => new URL(url).searchParams.get('s');

describe('getGravatarSizedUrl', () => {
  it.each(['s.gravatar.com', 'secure.gravatar.com'])(
    'should ask %s for twice the displayed size',
    (hostname) => {
      // Given
      const src = `https://${hostname}/avatar/${GRAVATAR_HASH}?s=480&r=pg`;

      // When
      const result = getGravatarSizedUrl(src, 24);

      // Then
      expect(result).toBe(
        `https://${hostname}/avatar/${GRAVATAR_HASH}?s=48&r=pg`
      );
    }
  );

  it('should add the size when the Gravatar URL has none', () => {
    // When
    const result = getGravatarSizedUrl(
      `https://s.gravatar.com/avatar/${GRAVATAR_HASH}`,
      42
    );

    // Then
    expect(sizeOf(result)).toBe('84');
  });

  it('should keep the other query parameters, the encoded default image included', () => {
    // Given
    const fallback = encodeURIComponent(AUTH0_URL);
    const src = `https://s.gravatar.com/avatar/${GRAVATAR_HASH}?s=480&r=pg&d=${fallback}`;

    // When
    const result = getGravatarSizedUrl(src, 32);

    // Then
    expect(result).toBe(
      `https://s.gravatar.com/avatar/${GRAVATAR_HASH}?s=64&r=pg&d=${fallback}`
    );
  });

  it('should replace the size alias, which Gravatar would read instead of s', () => {
    // When
    const result = getGravatarSizedUrl(
      `https://s.gravatar.com/avatar/${GRAVATAR_HASH}?size=480`,
      24
    );

    // Then
    expect(result).toBe(`https://s.gravatar.com/avatar/${GRAVATAR_HASH}?s=48`);
  });

  it('should round a fractional size up', () => {
    // When
    const result = getGravatarSizedUrl(
      `https://s.gravatar.com/avatar/${GRAVATAR_HASH}`,
      10.2
    );

    // Then
    expect(sizeOf(result)).toBe('21');
  });

  it('should not ask for more than Gravatar serves', () => {
    // When
    const result = getGravatarSizedUrl(
      `https://s.gravatar.com/avatar/${GRAVATAR_HASH}`,
      4000
    );

    // Then
    expect(sizeOf(result)).toBe('2048');
  });

  it.each([
    ['another host', AUTH0_URL],
    [
      'a host that only starts with a Gravatar one',
      `https://s.gravatar.com.evil.io/avatar/${GRAVATAR_HASH}?s=480`,
    ],
    [
      'a host that only ends with a Gravatar one',
      `https://evil-s.gravatar.com/avatar/${GRAVATAR_HASH}?s=480`,
    ],
    [
      'a Gravatar host given as a user name',
      `https://s.gravatar.com@evil.io/avatar/${GRAVATAR_HASH}?s=480`,
    ],
    [
      'a Gravatar URL in the query of another host',
      `https://evil.io/?u=https://s.gravatar.com/avatar/${GRAVATAR_HASH}`,
    ],
    ['a host Gravatar does not use for avatars', 'https://gravatar.com/a.png'],
    ['a relative path', '/user/picture/1?s=480'],
    ['a blob URL', 'blob:https://hub.filigran.io/1234'],
    ['a data URL', 'data:image/png;base64,AAAA'],
    ['text that is not a URL', 'not a url'],
    ['an empty string', ''],
  ])('should leave %s untouched', (_case, src) => {
    // When / Then
    expect(getGravatarSizedUrl(src, 24)).toBe(src);
  });
});

describe('getBackendPicturePath', () => {
  it('should return the path and the cache-buster of an absolute backend picture URL', () => {
    // When
    const result = getBackendPicturePath(`${ORIGIN}${PICTURE_PATH}`, ORIGIN);

    // Then
    expect(result).toBe(PICTURE_PATH);
  });

  it('should return a relative backend picture path as it is', () => {
    // When / Then
    expect(getBackendPicturePath(PICTURE_PATH, ORIGIN)).toBe(PICTURE_PATH);
  });

  it('should return the path without query when the URL has none', () => {
    // When / Then
    expect(
      getBackendPicturePath(`${ORIGIN}/user/picture/${USER_ID}`, ORIGIN)
    ).toBe(`/user/picture/${USER_ID}`);
  });

  it.each([
    ['another host', `https://evil.io/user/picture/${USER_ID}?t=1`],
    ['another scheme', `http://hub.filigran.io/user/picture/${USER_ID}?t=1`],
    ['another port', `${ORIGIN}:8443/user/picture/${USER_ID}?t=1`],
    [
      'a host that only starts with the origin',
      `${ORIGIN}.evil.io/user/picture/${USER_ID}?t=1`,
    ],
    ['a protocol-relative URL', `//evil.io/user/picture/${USER_ID}`],
    ['a backslash host', `/\\evil.io/user/picture/${USER_ID}`],
    ['another route', `${ORIGIN}/document/get/${USER_ID}`],
    ['a user id that is not a UUID', `${ORIGIN}/user/picture/someone`],
    ['a deeper path', `${ORIGIN}/user/picture/${USER_ID}/other`],
    ['a path traversal', `${ORIGIN}/user/picture/../auth/${USER_ID}`],
    ['a Gravatar picture', `https://s.gravatar.com/avatar/${GRAVATAR_HASH}`],
    ['a blob URL', `blob:${ORIGIN}/${USER_ID}`],
    ['a data URL', 'data:image/png;base64,AAAA'],
  ])('should return null for %s', (_case, src) => {
    // When / Then
    expect(getBackendPicturePath(src, ORIGIN)).toBeNull();
  });
});

describe('resolveAvatarImage', () => {
  it('should route a backend picture through the optimiser by its local path', () => {
    // When
    const result = resolveAvatarImage(`${ORIGIN}${PICTURE_PATH}`, 48, ORIGIN);

    // Then
    expect(result).toEqual({ src: PICTURE_PATH, optimized: true });
  });

  it('should size a Gravatar picture and load it as it is', () => {
    // When
    const result = resolveAvatarImage(
      `https://s.gravatar.com/avatar/${GRAVATAR_HASH}?s=480`,
      42,
      ORIGIN
    );

    // Then
    expect(result).toEqual({
      src: `https://s.gravatar.com/avatar/${GRAVATAR_HASH}?s=84`,
      optimized: false,
    });
  });

  it.each([
    ['an identity provider host', AUTH0_URL],
    ['a blob preview', 'blob:https://hub.filigran.io/1234'],
    ['a data preview', 'data:image/png;base64,AAAA'],
  ])('should load %s as it is', (_case, src) => {
    // When
    const result = resolveAvatarImage(src, 48, ORIGIN);

    // Then
    expect(result).toEqual({ src, optimized: false });
  });
});
