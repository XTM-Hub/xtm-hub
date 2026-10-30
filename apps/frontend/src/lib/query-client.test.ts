import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { createQueryClient } from '@/lib/query-client';
import { buildLoginRedirect } from '@/utils/redirect';
import { MutationObserver, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// setup-vitest.ts mocks getQueryClient for every other test: this file tests the real one.
vi.unmock('@/lib/query-client');

const CURRENT_PATHNAME = '/app/current-page';

const observeQuery = async (queryFn: () => Promise<string>) => {
  const observer = new QueryObserver(createQueryClient(), {
    queryKey: ['query-client-test'],
    queryFn,
    retryDelay: 0,
  });
  const unsubscribe = observer.subscribe(() => {});
  await vi.waitFor(() =>
    expect(observer.getCurrentResult().status).toBe('error')
  );
  unsubscribe();
};

const mutate = (error: Error, onError: () => void) => {
  const observer = new MutationObserver(createQueryClient(), {
    mutationFn: () => Promise.reject(error),
    onError,
  });
  return observer.mutate();
};

// A rejected mutation reaches its onError within the microtasks before this timer.
const flushMutationCallbacks = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe('createQueryClient', () => {
  let location: {
    href: string;
    pathname: string;
    search: string;
    hash: string;
  };

  beforeEach(() => {
    location = { href: '', pathname: CURRENT_PATHNAME, search: '', hash: '' };
    vi.stubGlobal('location', location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('queries', () => {
    it('should redirect to the login page when the session is expired', async () => {
      // Given
      const queryFn = () => Promise.reject(new UnauthenticatedError());

      // When
      await observeQuery(queryFn);

      // Then
      expect(location.href).toBe(buildLoginRedirect(CURRENT_PATHNAME));
    });

    it('should not retry when the session is expired', async () => {
      // Given
      const queryFn = vi.fn(() => Promise.reject(new UnauthenticatedError()));

      // When
      await observeQuery(queryFn);

      // Then
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('should retry three times when the query fails with another error', async () => {
      // Given
      const queryFn = vi.fn(() => Promise.reject(new Error('boom')));

      // When
      await observeQuery(queryFn);

      // Then
      expect(queryFn).toHaveBeenCalledTimes(4);
    });

    it('should not redirect when the query fails with another error', async () => {
      // Given
      const queryFn = () => Promise.reject(new Error('boom'));

      // When
      await observeQuery(queryFn);

      // Then
      expect(location.href).toBe('');
    });
  });

  describe('mutations', () => {
    it('should redirect to the login page when the session is expired', async () => {
      // Given
      const onError = vi.fn();

      // When
      void mutate(new UnauthenticatedError(), onError);

      // Then
      await vi.waitFor(() =>
        expect(location.href).toBe(buildLoginRedirect(CURRENT_PATHNAME))
      );
    });

    it('should not call the mutation onError when the session is expired', async () => {
      // Given
      const onError = vi.fn();

      // When
      void mutate(new UnauthenticatedError(), onError);
      await flushMutationCallbacks();

      // Then
      expect(onError).not.toHaveBeenCalled();
    });

    it('should call the mutation onError when the mutation fails with another error', async () => {
      // Given
      const onError = vi.fn();

      // When
      await mutate(new Error('boom'), onError).catch(() => {});

      // Then
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should not redirect when the mutation fails with another error', async () => {
      // Given
      const onError = vi.fn();

      // When
      await mutate(new Error('boom'), onError).catch(() => {});

      // Then
      expect(location.href).toBe('');
    });
  });
});

const loadQueryClientModule = async (isServer: boolean) => {
  vi.resetModules();
  vi.doMock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    isServer,
  }));
  return {
    ...(await import('@/lib/query-client')),
    // Same module registry as the client, or `instanceof` never matches.
    UnauthenticatedError: (await import('@/lib/graphql-fetch.utils'))
      .UnauthenticatedError,
  };
};

describe('getQueryClient', () => {
  afterEach(() => {
    vi.doUnmock('@tanstack/react-query');
    vi.unstubAllGlobals();
  });

  it('should create a new client on every server call', async () => {
    // Given
    const { getQueryClient } = await loadQueryClientModule(true);

    // When
    const first = getQueryClient();
    const second = getQueryClient();

    // Then
    expect(first).not.toBe(second);
  });

  it('should reuse one client in the browser', async () => {
    // Given
    const { getQueryClient } = await loadQueryClientModule(false);

    // When
    const first = getQueryClient();
    const second = getQueryClient();

    // Then
    expect(first).toBe(second);
  });

  it('should keep queries fresh long enough for a hydrated query not to refetch on mount', async () => {
    // Given
    const { getQueryClient, QUERY_STALE_TIME_MS } =
      await loadQueryClientModule(false);

    // When
    const { staleTime } = getQueryClient().getDefaultOptions().queries ?? {};

    // Then
    expect(QUERY_STALE_TIME_MS).toBeGreaterThan(0);
    expect(staleTime).toBe(QUERY_STALE_TIME_MS);
  });

  it('should never retry a query on the server', async () => {
    // Given
    const { getQueryClient } = await loadQueryClientModule(true);

    // When
    const { retry } = getQueryClient().getDefaultOptions().queries ?? {};

    // Then
    expect(retry).toBe(false);
  });

  it('should hand an expired session back to the server caller instead of redirecting', async () => {
    // Given
    const location = {
      href: '',
      pathname: CURRENT_PATHNAME,
      search: '',
      hash: '',
    };
    vi.stubGlobal('location', location);
    const { getQueryClient, UnauthenticatedError } =
      await loadQueryClientModule(true);

    // When
    const fetching = getQueryClient().fetchQuery({
      queryKey: ['query-client-test'],
      queryFn: () => Promise.reject(new UnauthenticatedError()),
    });

    // Then
    await expect(fetching).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(location.href).toBe('');
  });
});
