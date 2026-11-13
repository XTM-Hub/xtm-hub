import { describe, expect, it } from 'vitest';
import { getGravatarSizedUrl } from './gravatar';

const GRAVATAR_HASH = '538dc0e5c6e4b1d4f0b1e3a4c7d8f9a0';
const AUTH0_URL = 'https://cdn.example.test/avatars/jd.png';

const sizeOf = (url: string | undefined) =>
  new URL(url as string).searchParams.get('s');

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
      `https://s.gravatar.com.evil.example.test/avatar/${GRAVATAR_HASH}?s=480`,
    ],
    [
      'a host that only ends with a Gravatar one',
      `https://evil-s.gravatar.com/avatar/${GRAVATAR_HASH}?s=480`,
    ],
    [
      'a Gravatar host given as a user name',
      `https://s.gravatar.com@evil.example.test/avatar/${GRAVATAR_HASH}?s=480`,
    ],
    [
      'a Gravatar URL in the query of another host',
      `https://evil.example.test/?u=https://s.gravatar.com/avatar/${GRAVATAR_HASH}`,
    ],
    ['a host Gravatar does not use for avatars', 'https://gravatar.com/a.png'],
    ['a relative path', '/user/picture/1?s=480'],
    ['a blob URL', 'blob:https://hub.example.test/1234'],
    ['a data URL', 'data:image/png;base64,AAAA'],
    ['text that is not a URL', 'not a url'],
    ['an empty string', ''],
  ])('should leave %s untouched', (_case, src) => {
    // When / Then
    expect(getGravatarSizedUrl(src, 24)).toBe(src);
  });

  it('should return undefined when there is no src', () => {
    // When / Then
    expect(getGravatarSizedUrl(undefined, 24)).toBeUndefined();
  });
});
