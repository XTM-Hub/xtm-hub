import { DEBOUNCE_TIME } from '@/utils/constant';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDebouncedSearch,
  UseDebouncedSearchParams,
} from './use-debounced-search';

const TYPED_TERM = 'opencti';
const PARTIAL_TERM = 'open';
const APPLIED_TERM = 'openaev';

const typeTerm = (
  onChange: (event: { target: { value: string } }) => void,
  value: string
) => act(() => onChange({ target: { value } }));

const renderSearch = (params: UseDebouncedSearchParams) =>
  renderHook((props: UseDebouncedSearchParams) => useDebouncedSearch(props), {
    initialProps: params,
  });

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not apply the typed term when typing has not paused for the debounce time', () => {
    // Given
    const apply = vi.fn();
    const { result } = renderSearch({ apply });

    // When
    typeTerm(result.current.onChange, TYPED_TERM);
    act(() => vi.advanceTimersByTime(DEBOUNCE_TIME - 1));

    // Then
    expect(apply).not.toHaveBeenCalled();
  });

  it('should apply only the last typed term when typing pauses for the debounce time', () => {
    // Given
    const apply = vi.fn();
    const { result } = renderSearch({ apply });

    // When
    typeTerm(result.current.onChange, PARTIAL_TERM);
    typeTerm(result.current.onChange, TYPED_TERM);
    act(() => vi.advanceTimersByTime(DEBOUNCE_TIME));

    // Then
    expect(apply.mock.calls).toEqual([[TYPED_TERM]]);
  });

  it('should cancel the pending term and apply an empty one when clearing with an applied term', () => {
    // Given
    const apply = vi.fn();
    const { result } = renderSearch({ apply, appliedTerm: APPLIED_TERM });
    typeTerm(result.current.onChange, TYPED_TERM);

    // When
    act(() => result.current.onClear());
    act(() => vi.advanceTimersByTime(DEBOUNCE_TIME));

    // Then
    expect(apply.mock.calls).toEqual([['']]);
  });

  it('should apply an empty term when clearing after the hook applied a term itself', () => {
    // Given
    const apply = vi.fn();
    const { result } = renderSearch({ apply });
    typeTerm(result.current.onChange, TYPED_TERM);
    act(() => vi.advanceTimersByTime(DEBOUNCE_TIME));

    // When
    act(() => result.current.onClear());

    // Then
    expect(apply).toHaveBeenLastCalledWith('');
  });

  it.each([[undefined], [null], ['']])(
    'should apply nothing when clearing with no applied term %j',
    (appliedTerm) => {
      // Given
      const apply = vi.fn();
      const { result } = renderSearch({ apply, appliedTerm });
      typeTerm(result.current.onChange, TYPED_TERM);

      // When
      act(() => result.current.onClear());
      act(() => vi.advanceTimersByTime(DEBOUNCE_TIME));

      // Then
      expect(apply).not.toHaveBeenCalled();
    }
  );

  it('should cancel the pending term when clearing after a re-render with a new apply callback', () => {
    // Given
    const firstApply = vi.fn();
    const nextApply = vi.fn();
    const { result, rerender } = renderSearch({ apply: firstApply });
    typeTerm(result.current.onChange, TYPED_TERM);
    rerender({ apply: nextApply });

    // When
    act(() => result.current.onClear());
    act(() => vi.advanceTimersByTime(DEBOUNCE_TIME));

    // Then
    expect([...firstApply.mock.calls, ...nextApply.mock.calls]).toEqual([]);
  });

  it('should apply the pending term with the latest apply callback when re-rendered before the debounce time', () => {
    // Given
    const firstApply = vi.fn();
    const nextApply = vi.fn();
    const { result, rerender } = renderSearch({ apply: firstApply });
    typeTerm(result.current.onChange, TYPED_TERM);
    rerender({ apply: nextApply });

    // When
    act(() => vi.advanceTimersByTime(DEBOUNCE_TIME));

    // Then
    expect(nextApply).toHaveBeenCalledExactlyOnceWith(TYPED_TERM);
  });
});
