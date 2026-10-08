import { DEBOUNCE_TIME } from '@/utils/constant';
import { useCallback, useEffect, useRef } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

export interface UseDebouncedSearchParams {
  /** Filters the list on a term (URL param, state, refetch). */
  apply: (term: string) => void;
  /**
   * The term the list is filtered on, when the caller holds it.
   * Without it, the hook relies on the last term it applied.
   */
  appliedTerm?: string | null;
}

interface SearchChangeEvent {
  target: { value: string };
}

export interface UseDebouncedSearchResult {
  /** Applies the typed term once typing pauses for `DEBOUNCE_TIME`. */
  onChange: (event: SearchChangeEvent) => void;
  /** Drops the pending term and resets the search, for the clear cross and `Escape`. */
  onClear: () => void;
}

export const useDebouncedSearch = ({
  apply,
  appliedTerm,
}: UseDebouncedSearchParams): UseDebouncedSearchResult => {
  const applyRef = useRef(apply);
  const lastAppliedTermRef = useRef(appliedTerm ?? '');

  useEffect(() => {
    applyRef.current = apply;
  });

  // A new callback on each render would rebuild the debounce, and cancel would miss a call pending on the old one.
  const applyTerm = useCallback((term: string) => {
    lastAppliedTermRef.current = term;
    applyRef.current(term);
  }, []);

  const debouncedApplyTerm = useDebounceCallback(applyTerm, DEBOUNCE_TIME);

  const onChange = useCallback(
    (event: SearchChangeEvent) => debouncedApplyTerm(event.target.value),
    [debouncedApplyTerm]
  );

  const onClear = useCallback(() => {
    debouncedApplyTerm.cancel();
    // Escape also clears an already empty field, where there is nothing to reset.
    if (appliedTerm || lastAppliedTermRef.current) {
      applyTerm('');
    }
  }, [debouncedApplyTerm, appliedTerm, applyTerm]);

  return { onChange, onClear };
};
