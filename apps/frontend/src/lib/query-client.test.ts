import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { createQueryClient } from '@/lib/query-client';
import { buildLoginRedirect } from '@/utils/redirect';
import { MutationObserver, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('getQueryClient', () => {
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
