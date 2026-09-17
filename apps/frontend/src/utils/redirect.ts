import { logFrontendError } from '@/components/error-frontend-log.graphql';
import { getClientEnvironment } from '@/relay/environment/registry';

export const isSafeRedirect = (url: string): boolean => {
  // Browsers normalise a backslash to a forward slash, so `/\evil.com` would
  // become the protocol-relative `//evil.com`. A backslash is never legitimate
  // in a path we generate, so reject it wherever it appears.
  if (url.includes('\\')) return false;
  return url.startsWith('/') && !url.startsWith('//');
};

/**
 * Encodes a dynamic value (e.g. a Relay global ID, which is base64 and can
 * contain `+`, `/`, `=`) before interpolating it into a redirect `pathname`.
 * Without this, an unescaped `+`/`/` gets corrupted once the browser/Next.js
 * re-parses the decoded pathname as a real URL (e.g. `+` read back as a space).
 */
export const encodeRedirectValue = (value: string): string =>
  encodeURIComponent(value);

// Canonical builder for the auth redirect URLs. Encodes the pathname as a
// `redirect` query param, or returns `base` unchanged when none is given.
const buildAuthRedirect = (
  base: string,
  pathname: string | null | undefined
): string => {
  if (!pathname) return base;
  return `${base}?redirect=${encodeURIComponent(btoa(pathname))}`;
};

export const buildLoginRedirect = (
  pathname: string | null | undefined
): string => buildAuthRedirect('/login', pathname);

export const buildSignupRedirect = (
  pathname: string | null | undefined
): string => buildAuthRedirect('/sign-up', pathname);

export const buildOidcRedirect = (
  pathname: string | null | undefined
): string => buildAuthRedirect('/auth/oidc', pathname);

/**
 * Decodes a base64-encoded redirect parameter and validates it is a safe
 * relative path to prevent open redirect attacks (CWE-601).
 * Logs a warning when the param is unsafe or malformed.
 * Returns the decoded path if safe, null otherwise.
 */
export const decodeSafeRedirect = (
  b64: string | null | undefined
): string | null => {
  if (!b64) return null;
  try {
    const decoded = atob(b64);
    if (isSafeRedirect(decoded)) {
      return decoded;
    }
    const env = getClientEnvironment();
    if (env) {
      logFrontendError(env, `Unsafe redirect param detected: ${decoded}`);
    }
    return null;
  } catch {
    const env = getClientEnvironment();
    if (env) {
      logFrontendError(env, 'Malformed base64 redirect param');
    }
    return null;
  }
};
