import { describe, expect, it, vi } from 'vitest';
import { DatabaseType, getCachedColumnInfo } from './knexfile';

const fakeType = (): DatabaseType =>
  `test-only-${crypto.randomUUID()}` as DatabaseType;

describe('knexfile', () => {
  describe('getCachedColumnInfo', () => {
    it('should call the column fetcher exactly once for N concurrent callers on the same table', async () => {
      // Given
      const type = fakeType();
      const fetchColumns = vi.fn().mockResolvedValue(['name', 'email']);

      // When — 5 concurrent callers race to populate the same cache entry
      const results = await Promise.all(
        Array.from({ length: 5 }, () => getCachedColumnInfo(type, fetchColumns))
      );

      // Then
      expect(fetchColumns).toHaveBeenCalledTimes(1);
      results.forEach((result) => expect(result).toEqual(['name', 'email']));
    });

    it('should reuse the cached result on a later call without invoking the fetcher again', async () => {
      // Given
      const type = fakeType();
      const fetchColumns = vi.fn().mockResolvedValue(['id']);

      // When
      await getCachedColumnInfo(type, fetchColumns);
      await getCachedColumnInfo(type, fetchColumns);

      // Then
      expect(fetchColumns).toHaveBeenCalledTimes(1);
    });

    it('should evict the cache entry and retry on the next call after a transient failure', async () => {
      // Given — the fetcher fails once, then succeeds
      const type = fakeType();
      const fetchColumns = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient DB error'))
        .mockResolvedValueOnce(['id', 'name']);

      // When — the first call rejects...
      await expect(getCachedColumnInfo(type, fetchColumns)).rejects.toThrow(
        'transient DB error'
      );

      // ...and the second call must not return the poisoned cache entry.
      const result = await getCachedColumnInfo(type, fetchColumns);

      // Then
      expect(result).toEqual(['id', 'name']);
      expect(fetchColumns).toHaveBeenCalledTimes(2);
    });

    it('should not poison the cache for concurrent callers when the in-flight promise rejects', async () => {
      // Given
      const type = fakeType();
      const fetchColumns = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient DB error'))
        .mockResolvedValueOnce(['id']);

      // When — two concurrent callers share the same rejecting promise
      const [firstOutcome, secondOutcome] = await Promise.allSettled([
        getCachedColumnInfo(type, fetchColumns),
        getCachedColumnInfo(type, fetchColumns),
      ]);

      // Then — both see the rejection, and the fetcher was only called once
      // for the two concurrent callers (they shared the in-flight promise)
      expect(firstOutcome.status).toBe('rejected');
      expect(secondOutcome.status).toBe('rejected');
      expect(fetchColumns).toHaveBeenCalledTimes(1);

      // And the next, later call retries rather than reusing the rejection.
      const result = await getCachedColumnInfo(type, fetchColumns);
      expect(result).toEqual(['id']);
      expect(fetchColumns).toHaveBeenCalledTimes(2);
    });
  });
});
