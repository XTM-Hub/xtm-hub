const SAFE_PROTOCOLS = ['http:', 'https:'];

export const toExternalHref = (
  url: string | null | undefined
): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+-]*:/.test(trimmed);
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
