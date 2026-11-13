import { getImageProps } from 'next/image';
import { getGravatarSizedUrl } from './gravatar';

const BACKEND_PICTURE_PATHNAME =
  /^\/user\/picture\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The backend appends the upload time to the URL of a picture, to bust the caches when it changes.
const BACKEND_PICTURE_SEARCH = /^(\?t=\d+)?$/;
// Only there to resolve a local path: its host is never read.
const LOCAL_PARSE_BASE = 'http://localhost';

export interface AvatarPictureSource {
  src?: string;
  srcSet?: string;
  fallbackSrc?: string;
}

const parseUrl = (src: string): URL | null => {
  // A protocol-relative URL and a backslash (read as a slash by URL) can hide another host.
  if (src.startsWith('//') || src.startsWith('/\\')) {
    return null;
  }
  try {
    const url = new URL(src, LOCAL_PARSE_BASE);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

/**
 * Returns the local path (`/user/picture/:userId`) of a picture served by the backend, which stores
 * it as an absolute URL built on the front base URL, or null for any other picture.
 *
 * The path has NO query: the Next image optimiser only accepts a local path without query string
 * (its default), so nobody can vary the query to make it fetch and resize the same picture again.
 * The `t` cache-buster is therefore not part of the optimised URL: see getAvatarPictureSource.
 * Only the path of the URL is kept, so its host is never used: the optimiser always fetches the
 * path from our own server.
 */
const getBackendPicturePath = (src: string): string | null => {
  const url = parseUrl(src);
  if (
    !url ||
    url.username ||
    url.password ||
    !BACKEND_PICTURE_PATHNAME.test(url.pathname) ||
    !BACKEND_PICTURE_SEARCH.test(url.search)
  ) {
    return null;
  }
  return url.pathname;
};

/**
 * What an Avatar loads for a user picture, shown at `size` CSS pixels:
 * - a backend picture goes through the Next image optimiser (the size and its retina twin, in
 *   WebP), and falls back to the stored URL if the optimiser cannot serve it. The optimised URL has
 *   no `t` cache-buster, so a replaced picture only shows up in these views once the copies of the
 *   optimiser, and of the browsers, have expired. The optimiser keeps its copy for the longer of
 *   `images.minimumCacheTTL` (one day) and the backend `USER_PICTURE_CACHE_MAX_AGE_SECONDS` (a
 *   week), and it sends the full lifetime, not the time left, even for a stale copy it revalidates:
 *   in the worst case the old picture is still shown about two weeks after the change;
 * - a Gravatar picture is asked at twice the size;
 * - any other picture (identity provider host, blob: or data: preview) is used as it is.
 */
export const getAvatarPictureSource = (
  picture: string | null | undefined,
  size: number
): AvatarPictureSource => {
  if (!picture) {
    return {};
  }
  const backendPicturePath = getBackendPicturePath(picture);
  if (backendPicturePath) {
    const { props } = getImageProps({
      src: backendPicturePath,
      alt: '',
      width: size,
      height: size,
    });
    return {
      src: props.src,
      srcSet: props.srcSet,
      fallbackSrc: picture,
    };
  }
  return { src: getGravatarSizedUrl(picture, size) };
};
