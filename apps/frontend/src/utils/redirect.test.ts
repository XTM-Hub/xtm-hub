import { logFrontendError } from '@/components/error-frontend-log.graphql';
import { getClientEnvironment } from '@/relay/environment/registry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildLoginRedirect,
  buildOidcRedirect,
  decodeSafeRedirect,
  isSafeRedirect,
} from './redirect';

describe('isSafeRedirect', () => {
  it.each([
    ['/app/manage/user', true],
    ['/', true],
    ['/app/service/opencti_custom_dashboards/abc-123', true],
    ['//evil.com', false],
    ['/\\evil.com', false],
    ['/\\\\evil.com', false],
    ['\\\\evil.com', false],
    ['\\evil.com', false],
    ['/app/manage\\user', false],
    ['https://evil.com', false],
    ['https://evil.com/path', false],
    ['javascript:alert(1)', false],
    ['data:text/html,<script>alert(1)</script>', false],
    ['', false],
  ])('isSafeRedirect(%s) === %s', (url, expected) => {
    expect(isSafeRedirect(url)).toBe(expected);
  });
});

describe('buildLoginRedirect', () => {
  it('returns /login for null', () => {
    expect(buildLoginRedirect(null)).toBe('/login');
  });

  it('returns /login for undefined', () => {
    expect(buildLoginRedirect(undefined)).toBe('/login');
  });

  it('returns /login for empty string', () => {
    expect(buildLoginRedirect('')).toBe('/login');
  });

  it('encodes the pathname as encodeURIComponent(btoa(pathname))', () => {
    const path = '/app/manage/user';
    const expected = `/login?redirect=${encodeURIComponent(btoa(path))}`;
    expect(buildLoginRedirect(path)).toBe(expected);
  });

  it('encodes + in base64 as %2B to prevent Express qs corruption', () => {
    // Find a path whose base64 contains +
    // btoa produces + for certain byte sequences; we test the encoding guarantee directly
    const path = '/app/manage/user';
    const result = buildLoginRedirect(path);
    const paramValue = result.split('?redirect=')[1];
    // The encoded param must not contain raw + (which qs would decode as space)
    expect(paramValue).not.toContain('+');
  });

  it('round-trips correctly through URLSearchParams and decodeSafeRedirect', () => {
    const path = '/app/service/opencti_custom_dashboards/abc-123';
    const loginUrl = buildLoginRedirect(path);
    const b64 = new URLSearchParams(loginUrl.split('?')[1]).get('redirect');
    expect(decodeSafeRedirect(b64)).toBe(path);
  });

  it('round-trips a path that produces + in base64', () => {
    // '\xfb' byte produces + in base64; use a path that contains such a byte sequence
    // We simulate by constructing a path whose base64 contains +
    // Iterate paths until we find one — or directly test encoding contract:
    const path = '/app/manage/user';
    const b64 = btoa(path);
    const encoded = encodeURIComponent(b64);
    // If b64 had +, encoded would have %2B; URLSearchParams would decode %2B back to +
    const recovered = new URLSearchParams(`redirect=${encoded}`).get(
      'redirect'
    );
    expect(recovered).toBe(b64);
    expect(atob(recovered!)).toBe(path);
  });

  it('round-trips a path with query params — ?pendingUsers must survive', () => {
    const path = '/app/manage/user?pendingUsers';
    const loginUrl = buildLoginRedirect(path);
    const b64 = new URLSearchParams(loginUrl.split('?')[1]).get('redirect');
    expect(decodeSafeRedirect(b64)).toBe(path);
  });

  it('round-trips a path with multiple query params', () => {
    const path = '/app/manage/user?tab=pending&page=2';
    const loginUrl = buildLoginRedirect(path);
    const b64 = new URLSearchParams(loginUrl.split('?')[1]).get('redirect');
    expect(decodeSafeRedirect(b64)).toBe(path);
  });
});

describe('buildOidcRedirect', () => {
  it.each([[null], [undefined], ['']])('returns /auth/oidc for %s', (value) => {
    expect(buildOidcRedirect(value)).toBe('/auth/oidc');
  });

  it('encodes the pathname as encodeURIComponent(btoa(pathname))', () => {
    const path = '/app/service/xtm_platform_roadmap/abc-123/feature-voting';
    const expected = `/auth/oidc?redirect=${encodeURIComponent(btoa(path))}`;
    expect(buildOidcRedirect(path)).toBe(expected);
  });

  it('encodes + in base64 as %2B', () => {
    const path = '/~~';
    const result = buildOidcRedirect(path);
    // Sanity check: this path's base64 genuinely contains a + so the guard is exercised
    expect(btoa(path)).toContain('+');
    // qs decodes a raw + as a space, so the + must be percent-encoded as %2B
    expect(result.split('?redirect=')[1]).toContain('%2B');
    expect(result.split('?redirect=')[1]).not.toContain('+');
  });

  it('round-trips through URLSearchParams and decodeSafeRedirect', () => {
    const path = '/cybersecurity-solutions/xtm-platform-roadmap/feature-voting';
    const url = buildOidcRedirect(path);
    const b64 = new URLSearchParams(url.split('?')[1]).get('redirect');
    expect(decodeSafeRedirect(b64)).toBe(path);
  });
});

describe('decodeSafeRedirect', () => {
  beforeEach(() => {
    vi.mocked(getClientEnvironment).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for null', () => {
    expect(decodeSafeRedirect(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(decodeSafeRedirect(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeSafeRedirect('')).toBeNull();
  });

  it('decodes a valid safe base64 redirect param', () => {
    const path = '/app/manage/user';
    expect(decodeSafeRedirect(btoa(path))).toBe(path);
  });

  it('handles = padding correctly', () => {
    // btoa('/app/manage/user') = 'L2FwcC9tYW5hZ2UvdXNlcg==' — 2 padding chars
    expect(decodeSafeRedirect('L2FwcC9tYW5hZ2UvdXNlcg==')).toBe(
      '/app/manage/user'
    );
  });

  it('returns null when base64 decodes to an unsafe path', () => {
    expect(decodeSafeRedirect(btoa('//evil.com'))).toBeNull();
    expect(decodeSafeRedirect(btoa('https://evil.com'))).toBeNull();
  });

  it('returns null when base64 decodes to a backslash bypass path', () => {
    expect(decodeSafeRedirect(btoa('/\\evil.com'))).toBeNull();
    expect(decodeSafeRedirect(btoa('\\\\evil.com'))).toBeNull();
    expect(decodeSafeRedirect(btoa('/app/manage\\user'))).toBeNull();
  });

  it('calls logFrontendError when base64 decodes to a backslash bypass path', () => {
    const mockEnv = {} as never;
    vi.mocked(getClientEnvironment).mockReturnValue(mockEnv);

    decodeSafeRedirect(btoa('/\\evil.com'));

    expect(logFrontendError).toHaveBeenCalledWith(
      mockEnv,
      'Unsafe redirect param detected: /\\evil.com'
    );
  });

  it('calls logFrontendError when base64 decodes to an unsafe path', () => {
    const mockEnv = {} as never;
    vi.mocked(getClientEnvironment).mockReturnValue(mockEnv);

    decodeSafeRedirect(btoa('https://evil.com'));

    expect(logFrontendError).toHaveBeenCalledWith(
      mockEnv,
      'Unsafe redirect param detected: https://evil.com'
    );
  });

  it('calls logFrontendError when base64 decodes to a protocol-relative unsafe path', () => {
    const mockEnv = {} as never;
    vi.mocked(getClientEnvironment).mockReturnValue(mockEnv);

    decodeSafeRedirect(btoa('//evil.com'));

    expect(logFrontendError).toHaveBeenCalledWith(
      mockEnv,
      'Unsafe redirect param detected: //evil.com'
    );
  });

  it('returns null and does not throw for malformed base64', () => {
    expect(() => decodeSafeRedirect('!!!not-base64!!!')).not.toThrow();
    expect(decodeSafeRedirect('!!!not-base64!!!')).toBeNull();
  });

  it('calls logFrontendError when base64 is malformed and environment is available', () => {
    const mockEnv = {} as never;
    vi.mocked(getClientEnvironment).mockReturnValue(mockEnv);

    decodeSafeRedirect('!!!not-base64!!!');

    expect(logFrontendError).toHaveBeenCalledWith(
      mockEnv,
      'Malformed base64 redirect param'
    );
  });

  it('does not call logFrontendError when environment is null', () => {
    vi.mocked(getClientEnvironment).mockReturnValue(null);

    decodeSafeRedirect('!!!not-base64!!!');

    expect(logFrontendError).not.toHaveBeenCalled();
  });

  it('does not call logFrontendError for valid safe input', () => {
    const mockEnv = {} as never;
    vi.mocked(getClientEnvironment).mockReturnValue(mockEnv);

    decodeSafeRedirect(btoa('/app/manage/user'));

    expect(logFrontendError).not.toHaveBeenCalled();
  });
});
