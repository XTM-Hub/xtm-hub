import { getImageProps } from 'next/image';
import { getGravatarSizedUrl } from './gravatar';

// The picture route of the backend. It mirrors the `images.localPatterns` entry of next.config.mjs,
// which is what lets the Next image optimiser fetch these pictures.
const BACKEND_PICTURE_PATHNAME =
  /^\/user\/picture\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The backend appends the upload time to the URL of a picture, to bust the caches when it changes.
const BACKEND_PICTURE_SEARCH = /^(\?t=\d+)?$/;
// Only there to resolve a local path: its host is never read.
const LOCAL_PARSE_BASE = 'http://localhost';

export interface AvatarPictureSource {
  src?: string;
  srcSet?: string;
  sizes?: string;
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
 * Returns the local path (`/user/picture/:userId?t=...`) of a picture served by the backend, which
 * stores it as an absolute URL built on the front base URL, or null for any other picture.
 *
 * Only the path and the query of the URL are kept, so the host of the stored URL is never used: the
 * Next image optimiser always fetches this path from our own server.
 */
export const getBackendPicturePath = (src: string): string | null => {
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
  return url.pathname + url.search;
};

/**
 * What an Avatar loads for a user picture, shown at `size` CSS pixels:
 * - a backend picture goes through the Next image optimiser (the size and its retina twin, in
 *   WebP), and falls back to the stored URL if the optimiser cannot serve it;
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
      sizes: props.sizes,
      fallbackSrc: picture,
    };
  }
  return { src: getGravatarSizedUrl(picture, size) };
};
