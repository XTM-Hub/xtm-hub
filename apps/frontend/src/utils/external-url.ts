const SAFE_PROTOCOLS = ['http:', 'https:'];

// The origin a postMessage to this URL must target, or null when the URL is not a valid http(s) URL.
export const toUrlOrigin = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.includes(parsed.protocol) ? parsed.origin : null;
  } catch {
    return null;
  }
};

export const toExternalHref = (
  url: string | null | undefined
): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+-]*:(?!\d)/.test(trimmed);
  const candidate = hasScheme
    ? trimmed
    : trimmed.startsWith('//')
      ? `https:${trimmed}`
      : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};
