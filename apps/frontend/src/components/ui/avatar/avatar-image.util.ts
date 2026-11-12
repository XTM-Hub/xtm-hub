// Displayed size of an avatar when the caller gives none, in CSS pixels (the largest in-app avatar bar the profile one).
export const DEFAULT_AVATAR_SIZE = 48;

// Pictures are requested at twice their displayed size so they stay sharp on retina screens.
const PIXEL_DENSITY = 2;
// Gravatar refuses anything above 2048 px.
const GRAVATAR_MAX_PIXELS = 2048;
// Exact hosts only: a lookalike such as "s.gravatar.com.evil.io" must never be rewritten.
const GRAVATAR_HOSTNAMES = new Set(['s.gravatar.com', 'secure.gravatar.com']);
// The picture route of the backend, which the next.config.mjs `images.localPatterns` entry mirrors.
const BACKEND_PICTURE_PATHNAME =
  /^\/user\/picture\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AvatarImage {
  src: string;
  // True when `src` is a local path that next/image may route through the Next image optimiser.
  optimized: boolean;
}

const parseUrl = (src: string, base?: string): URL | null => {
  try {
    return new URL(src, base);
  } catch {
    return null;
  }
};

/**
 * Asks Gravatar for an image of about twice the displayed size (the `s` query parameter).
 * Returns the URL untouched when it is not a Gravatar one, or cannot be parsed.
 */
export const getGravatarSizedUrl = (src: string, size: number): string => {
  const url = parseUrl(src);
  if (!url || !GRAVATAR_HOSTNAMES.has(url.hostname)) {
    return src;
  }
  const pixels = Math.min(
    Math.max(Math.ceil(size * PIXEL_DENSITY), 1),
    GRAVATAR_MAX_PIXELS
  );
  url.searchParams.set('s', String(pixels));
  // Gravatar also reads `size`, which would win over `s` when both are present.
  url.searchParams.delete('size');
  return url.toString();
};

/**
 * Returns the local path (`/user/picture/:userId?t=...`) of a picture served by the backend,
 * or null for any other picture. The backend stores that picture as an absolute URL built on
 * the front base URL, so an absolute URL only counts when it is on the origin of the page.
 */
export const getBackendPicturePath = (
  src: string,
  origin: string
): string | null => {
  if (src.startsWith('//')) {
    return null;
  }
  const url = parseUrl(src, origin);
  if (
    !url ||
    url.origin !== origin ||
    !BACKEND_PICTURE_PATHNAME.test(url.pathname)
  ) {
    return null;
  }
  return url.pathname + url.search;
};

/**
 * Chooses what the avatar loads: a backend picture goes through the Next image optimiser,
 * a Gravatar one is asked at the right size, and any other picture (identity provider host,
 * blob: or data: preview) is loaded as it is.
 */
export const resolveAvatarImage = (
  src: string,
  size: number,
  origin: string
): AvatarImage => {
  const backendPicturePath = getBackendPicturePath(src, origin);
  if (backendPicturePath) {
    return { src: backendPicturePath, optimized: true };
  }
  return { src: getGravatarSizedUrl(src, size), optimized: false };
};
