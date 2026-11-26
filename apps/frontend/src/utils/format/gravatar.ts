// Pictures are requested at twice their displayed size so they stay sharp on retina screens.
const PIXEL_DENSITY = 2;
// Gravatar refuses anything above 2048 px.
const GRAVATAR_MAX_PIXELS = 2048;
// Exact hosts only (the ones the CSP img-src allows): a lookalike such as
// "s.gravatar.com.evil.io" must never be rewritten.
const GRAVATAR_HOSTNAMES = new Set(['s.gravatar.com', 'secure.gravatar.com']);

/**
 * Asks Gravatar for a picture of about twice the displayed size (the `s` query parameter).
 * Returns the URL untouched when it is not a Gravatar one, or cannot be parsed.
 */
export const getGravatarSizedUrl = (
  src: string | undefined,
  size: number
): string | undefined => {
  if (!src) {
    return src;
  }
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (!GRAVATAR_HOSTNAMES.has(url.hostname)) {
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
