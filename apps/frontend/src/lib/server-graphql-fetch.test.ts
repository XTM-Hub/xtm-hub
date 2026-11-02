import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { isDevelopment } from '@/lib/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Development forces `no-store`, which would hide the cache option under test.
vi.mock('@/lib/utils', () => ({ isDevelopment: vi.fn() }));

const QUERY = 'query Settings { settings { base_url_front } }';

const mockFetchResponse = (body: unknown) => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const requestHeaders = (fetchMock: ReturnType<typeof mockFetchResponse>) =>
  new Headers(fetchMock.mock.calls[0]?.[1]?.headers);

describe('serverGraphqlFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDevelopment).mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should send no cookie header when the operation is public', async () => {
    // Given
    const fetchMock = mockFetchResponse({ data: { settings: {} } });

    // When
    await serverGraphqlFetch(QUERY);

    // Then
    expect(requestHeaders(fetchMock).has('cookie')).toBe(false);
  });

  it('should keep the caller options untouched when development forces no-store', async () => {
    // Given
    mockFetchResponse({ data: { settings: {} } });
    vi.mocked(isDevelopment).mockReturnValue(true);
    // Development traces every operation: keep the test output clean.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const options = { cache: 'force-cache' as const, next: { revalidate: 60 } };

    // When
    await serverGraphqlFetch(QUERY, {}, options);

    // Then
    expect(options.next).toEqual({ revalidate: 60 });
  });
});
