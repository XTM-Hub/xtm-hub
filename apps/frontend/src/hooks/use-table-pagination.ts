import { PaginationState, Updater } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

export const toCursor = (pageSize: number, pageIndex: number): string =>
  btoa(String(pageSize * pageIndex));

const resolveUpdater = (
  updater: Updater<PaginationState>,
  pagination: PaginationState
): PaginationState =>
  updater instanceof Function ? updater(pagination) : updater;

export interface UseTablePaginationParams {
  /** Current page size, typically sourced from a `use*ListLocalstorage` hook. */
  pageSize: number;
  /** Persists the page size, typically the setter from a `use*ListLocalstorage` hook. */
  setPageSize: (size: number) => void;
  /**
   * Optional transform applied to the next page size before it is stored/used
   * (e.g. clamping to a fixed set of allowed values).
   */
  normalizePageSize?: (size: number) => number;
  /**
   * Called after the internal pagination state has been updated. Callers that need to
   * trigger a refetch (Relay `refetch`, GraphQL query variables, ...) should do so here.
   * Callers whose data-fetching already reacts to pagination state (e.g. react-query hooks
   * reading `pagination` from a `useMemo`) can omit this.
   */
  onPaginationChange?: (pagination: PaginationState, cursor: string) => void;
}

export interface UseTablePaginationResult {
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  /** `btoa(pageSize * pageIndex)`, always in sync with `pagination`. */
  cursor: string;
  /** Pass directly to `DataTable`/`PaginationControls` table options. */
  onPaginationChange: (updater: Updater<PaginationState>) => void;
  /**
   * Steps back to the last page when the list shrank under the current one (the last row
   * of the last page removed). Call it while rendering, right after the list query, so
   * the emptied page's cursor is never sent again. It moves the page through
   * `setPagination`, without calling the `onPaginationChange` option: the query must
   * read `cursor`.
   */
  stepBackToLastPage: (list: ListQueryState) => void;
}

/** What `stepBackToLastPage` reads of the list query. */
export interface ListQueryState {
  totalCount: number | undefined;
  isSuccess: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
}

/**
 * Mutualizes the pagination state + relay-style cursor computation duplicated across the
 * app's list components (pageIndex/pageSize state, `btoa` cursor math, and the
 * `updater instanceof Function` normalization needed by `@tanstack/react-table`).
 *
 * Sorting is intentionally out of scope: callers that combine sorting with pagination should
 * keep their own `handleRefetchData`-style function and invoke it from `onPaginationChange`.
 */
export const useTablePagination = ({
  pageSize,
  setPageSize,
  normalizePageSize,
  onPaginationChange,
}: UseTablePaginationParams): UseTablePaginationResult => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const cursor = toCursor(pagination.pageSize, pagination.pageIndex);

  const handlePaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      const resolved = resolveUpdater(updater, pagination);
      const nextPageSize = normalizePageSize
        ? normalizePageSize(resolved.pageSize)
        : resolved.pageSize;
      const nextPagination: PaginationState = {
        ...resolved,
        pageSize: nextPageSize,
      };

      onPaginationChange?.(
        nextPagination,
        toCursor(nextPagination.pageSize, nextPagination.pageIndex)
      );

      setPagination(nextPagination);
      if (nextPageSize !== pageSize) {
        setPageSize(nextPageSize);
      }
    },
    [normalizePageSize, onPaginationChange, pageSize, pagination, setPageSize]
  );

  // Only a settled response is trusted: a placeholder holds the previous page's count,
  // and an invalidated page cached while inactive is served stale while it refetches.
  const stepBackToLastPage = ({
    totalCount,
    isSuccess,
    isFetching,
    isPlaceholderData,
  }: ListQueryState) => {
    if (
      !isSuccess ||
      isFetching ||
      isPlaceholderData ||
      totalCount === undefined
    ) {
      return;
    }
    const lastPageIndex = Math.max(
      0,
      Math.ceil(totalCount / pagination.pageSize) - 1
    );
    if (pagination.pageIndex > lastPageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: lastPageIndex }));
    }
  };

  return {
    pagination,
    setPagination,
    cursor,
    onPaginationChange: handlePaginationChange,
    stepBackToLastPage,
  };
};
