import { resolvePrivatePath } from '@/utils/path/public-to-private';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectToPrivateCounterpart } from './private-counterpart';
import { loadBaseUrlFront } from './utils/load';

vi.mock('./utils/load');
vi.mock('@/utils/path/public-to-private', () => ({
  resolvePrivatePath: vi.fn(),
}));

const BASE_URL = 'http://localhost:3002';
const APP_HOME = `${BASE_URL}/app`;
const PUBLIC_PATH = '/en/cybersecurity-solutions/opencti-integrations';
const PRIVATE_PATH = '/app/service/opencti_integrations/integrations-id';

const makeRequest = (path?: string) =>
  new NextRequest(
    path === undefined
      ? `${BASE_URL}/redirect/private-counterpart`
      : `${BASE_URL}/redirect/private-counterpart?path=${encodeURIComponent(path)}`
  );

describe('redirectToPrivateCounterpart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadBaseUrlFront).mockResolvedValue(BASE_URL);
    vi.mocked(resolvePrivatePath).mockResolvedValue(PRIVATE_PATH);
  });

  it('should redirect to the private counterpart of the public page', async () => {
    // When
    const response = await redirectToPrivateCounterpart(
      makeRequest(PUBLIC_PATH)
    );

    // Then
    expect(resolvePrivatePath).toHaveBeenCalledWith(PUBLIC_PATH);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${BASE_URL}${PRIVATE_PATH}`);
  });

  it('should redirect to the app home when the public page has no private counterpart', async () => {
    // Given
    vi.mocked(resolvePrivatePath).mockResolvedValue(null);

    // When
    const response = await redirectToPrivateCounterpart(
      makeRequest('/en/cybersecurity-solutions')
    );

    // Then
    expect(response.headers.get('location')).toBe(APP_HOME);
  });

  it('should redirect to the app home when the private counterpart cannot be resolved', async () => {
    // Given
    vi.mocked(resolvePrivatePath).mockRejectedValue(new Error('API down'));

    // When
    const response = await redirectToPrivateCounterpart(
      makeRequest(PUBLIC_PATH)
    );

    // Then
    expect(response.headers.get('location')).toBe(APP_HOME);
  });

  it.each([
    { reason: 'missing', path: undefined },
    { reason: 'empty', path: '' },
    { reason: 'protocol-relative', path: '//evil.com' },
    { reason: 'absolute', path: 'https://evil.com' },
    { reason: 'backslash', path: '/\\evil.com' },
  ])(
    'should redirect to the app home without resolving when the path is $reason',
    async ({ path }) => {
      // When
      const response = await redirectToPrivateCounterpart(makeRequest(path));

      // Then
      expect(resolvePrivatePath).not.toHaveBeenCalled();
      expect(response.headers.get('location')).toBe(APP_HOME);
    }
  );
});
