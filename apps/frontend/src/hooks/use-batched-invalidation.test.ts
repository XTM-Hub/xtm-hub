import {
  INVALIDATION_BATCH_DELAY_MS,
  INVALIDATION_BATCH_MAX_WAIT_MS,
  useBatchedInvalidation,
} from '@/hooks/use-batched-invalidation';
import {
  InvalidateQueryFilters,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FIRST_PAGE: InvalidateQueryFilters = {
  queryKey: ['Users', { page: 1 }],
  exact: true,
};
const SECOND_PAGE: InvalidateQueryFilters = {
  queryKey: ['Users', { page: 2 }],
  exact: true,
};
const BURST_SIZE = 20;
// Shorter than the delay: every request of the burst restarts the wait.
const BURST_INTERVAL_MS = INVALIDATION_BATCH_DELAY_MS - 50;

const renderBatchedInvalidation = (filters = FIRST_PAGE) => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const rendered = renderHook(
    ({ filters: currentFilters }) => useBatchedInvalidation(currentFilters),
    {
      initialProps: { filters },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    }
  );
  return { invalidateQueries, ...rendered };
};

describe('useBatchedInvalidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should invalidate once, after the delay, when invalidations are asked in a burst', () => {
    // Given
    const { result, invalidateQueries } = renderBatchedInvalidation();
    for (let request = 0; request < BURST_SIZE; request += 1) {
      result.current();
    }
    act(() => vi.advanceTimersByTime(INVALIDATION_BATCH_DELAY_MS - 1));
    expect(invalidateQueries).not.toHaveBeenCalled();

    // When
    act(() => vi.advanceTimersByTime(1));

    // Then
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(FIRST_PAGE);
  });

  it('should invalidate at the max wait when a burst goes on longer than it', () => {
    // Given
    const { result, invalidateQueries } = renderBatchedInvalidation();

    // When
    for (
      let elapsed = 0;
      elapsed < INVALIDATION_BATCH_MAX_WAIT_MS;
      elapsed += BURST_INTERVAL_MS
    ) {
      result.current();
      act(() => vi.advanceTimersByTime(BURST_INTERVAL_MS));
    }

    // Then
    expect(invalidateQueries).toHaveBeenCalledOnce();
  });

  it('should wait the whole delay again for a burst that comes after a batch has run', () => {
    // Given
    const { result, invalidateQueries } = renderBatchedInvalidation();
    result.current();
    act(() => vi.advanceTimersByTime(INVALIDATION_BATCH_MAX_WAIT_MS));
    expect(invalidateQueries).toHaveBeenCalledOnce();

    // When
    for (let request = 0; request < BURST_SIZE; request += 1) {
      result.current();
    }
    act(() => vi.advanceTimersByTime(INVALIDATION_BATCH_DELAY_MS - 1));

    // Then
    expect(invalidateQueries).toHaveBeenCalledOnce();
  });

  it('should invalidate the query on screen when it changes during the wait', () => {
    // Given
    const { result, rerender, invalidateQueries } = renderBatchedInvalidation();
    result.current();

    // When
    rerender({ filters: SECOND_PAGE });
    act(() => vi.advanceTimersByTime(INVALIDATION_BATCH_DELAY_MS));

    // Then
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(SECOND_PAGE);
  });

  it('should invalidate at once when the component unmounts during the wait', () => {
    // Given
    const { result, unmount, invalidateQueries } = renderBatchedInvalidation();
    result.current();

    // When
    unmount();

    // Then
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(FIRST_PAGE);
    act(() => vi.advanceTimersByTime(INVALIDATION_BATCH_DELAY_MS));
    expect(invalidateQueries).toHaveBeenCalledOnce();
  });

  it('should invalidate at once when asked after the component has unmounted', () => {
    // Given
    const { result, unmount, invalidateQueries } = renderBatchedInvalidation();
    const askInvalidation = result.current;
    unmount();

    // When
    askInvalidation();

    // Then
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(FIRST_PAGE);
  });

  it('should not invalidate on unmount when nothing was asked', () => {
    // Given
    const { unmount, invalidateQueries } = renderBatchedInvalidation();

    // When
    unmount();

    // Then
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
