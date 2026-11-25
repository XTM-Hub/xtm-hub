import { InvalidateQueryFilters, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

/** Quiet time after the last request before the invalidation runs. */
export const INVALIDATION_BATCH_DELAY_MS = 250;
/** Longest wait from the first request of a batch, however long it goes on. */
export const INVALIDATION_BATCH_MAX_WAIT_MS = 1_000;

/**
 * Batches the invalidations of a query asked in a burst into a single one, so a
 * burst of real-time events, or a mutation followed by the event it causes,
 * refetches the query once instead of once per request.
 *
 * The returned function asks for an invalidation. It runs once no request has
 * come for `INVALIDATION_BATCH_DELAY_MS`, and never later than
 * `INVALIDATION_BATCH_MAX_WAIT_MS` after the first request of the batch, so a
 * long burst still refreshes the query at that pace.
 *
 * The filters are read when the invalidation runs, not when it is asked: a
 * page, search or sort change during the wait invalidates the query now on
 * screen.
 *
 * An invalidation still waiting when the component unmounts runs at once, and
 * one asked after the unmount (a mutation that settles once the tabs have
 * unmounted the list) runs at once too. Without an observer, the query is only
 * marked stale, and refetched when it is shown again.
 */
export const useBatchedInvalidation = (
  filters: InvalidateQueryFilters
): (() => void) => {
  const queryClient = useQueryClient();
  const filtersRef = useRef(filters);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const batchStartRef = useRef<number | undefined>(undefined);
  const isMountedRef = useRef(false);

  useEffect(() => {
    filtersRef.current = filters;
  });

  const invalidate = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    batchStartRef.current = undefined;
    void queryClient.invalidateQueries(filtersRef.current);
  }, [queryClient]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current !== undefined) {
        invalidate();
      }
    };
  }, [invalidate]);

  return useCallback(() => {
    if (!isMountedRef.current) {
      invalidate();
      return;
    }
    const now = Date.now();
    batchStartRef.current ??= now;
    const untilMaxWait =
      batchStartRef.current + INVALIDATION_BATCH_MAX_WAIT_MS - now;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      invalidate,
      Math.max(0, Math.min(INVALIDATION_BATCH_DELAY_MS, untilMaxWait))
    );
  }, [invalidate]);
};
