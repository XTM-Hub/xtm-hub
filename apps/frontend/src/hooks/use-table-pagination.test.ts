import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { toCursor, useTablePagination } from './use-table-pagination';

describe('useTablePagination', () => {
  describe('toCursor', () => {
    it.each`
      pageSize | pageIndex | expected
      ${50}    | ${0}      | ${btoa('0')}
      ${50}    | ${1}      | ${btoa('50')}
      ${25}    | ${3}      | ${btoa('75')}
    `(
      'should compute cursor "$expected" for pageSize=$pageSize pageIndex=$pageIndex',
      ({ pageSize, pageIndex, expected }) => {
        expect(toCursor(pageSize, pageIndex)).toBe(expected);
      }
    );
  });

  it('should initialize pagination state from pageSize with pageIndex 0', () => {
    const { result } = renderHook(() =>
      useTablePagination({ pageSize: 50, setPageSize: vi.fn() })
    );

    expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 50 });
    expect(result.current.cursor).toBe(toCursor(50, 0));
  });

  it('should update pagination state and cursor when onPaginationChange is called with a value', () => {
    const { result } = renderHook(() =>
      useTablePagination({ pageSize: 50, setPageSize: vi.fn() })
    );

    act(() => {
      result.current.onPaginationChange({ pageIndex: 2, pageSize: 50 });
    });

    expect(result.current.pagination).toEqual({ pageIndex: 2, pageSize: 50 });
    expect(result.current.cursor).toBe(toCursor(50, 2));
  });

  it('should support an updater function, matching @tanstack/react-table conventions', () => {
    const { result } = renderHook(() =>
      useTablePagination({ pageSize: 50, setPageSize: vi.fn() })
    );

    act(() => {
      result.current.onPaginationChange((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex + 1,
      }));
    });

    expect(result.current.pagination.pageIndex).toBe(1);
  });

  it('should call setPageSize only when the page size actually changes', () => {
    const setPageSize = vi.fn();
    const { result } = renderHook(() =>
      useTablePagination({ pageSize: 50, setPageSize })
    );

    act(() => {
      result.current.onPaginationChange({ pageIndex: 1, pageSize: 50 });
    });
    expect(setPageSize).not.toHaveBeenCalled();

    act(() => {
      result.current.onPaginationChange({ pageIndex: 0, pageSize: 100 });
    });
    expect(setPageSize).toHaveBeenCalledWith(100);
  });

  it('should invoke onPaginationChange callback with the new pagination and matching cursor', () => {
    const onPaginationChangeCallback = vi.fn();
    const { result } = renderHook(() =>
      useTablePagination({
        pageSize: 50,
        setPageSize: vi.fn(),
        onPaginationChange: onPaginationChangeCallback,
      })
    );

    act(() => {
      result.current.onPaginationChange({ pageIndex: 3, pageSize: 50 });
    });

    expect(onPaginationChangeCallback).toHaveBeenCalledWith(
      { pageIndex: 3, pageSize: 50 },
      toCursor(50, 3)
    );
  });

  it('should apply normalizePageSize before storing and reporting the new page size', () => {
    const setPageSize = vi.fn();
    const normalizePageSize = (size: number) => (size > 60 ? 60 : size);
    const { result } = renderHook(() =>
      useTablePagination({ pageSize: 50, setPageSize, normalizePageSize })
    );

    act(() => {
      result.current.onPaginationChange({ pageIndex: 0, pageSize: 100 });
    });

    expect(result.current.pagination.pageSize).toBe(60);
    expect(setPageSize).toHaveBeenCalledWith(60);
  });
  describe('stepBackToLastPage', () => {
    const SETTLED = {
      isSuccess: true,
      isFetching: false,
      isPlaceholderData: false,
    };

    // 120 rows read 50 by 50 end on the third page.
    const renderOnThirdPage = () => {
      const hook = renderHook(() =>
        useTablePagination({ pageSize: 50, setPageSize: vi.fn() })
      );
      act(() => {
        hook.result.current.onPaginationChange({ pageIndex: 2, pageSize: 50 });
      });
      return hook;
    };

    it.each([
      { totalCount: 60, expectedPageIndex: 1 },
      { totalCount: 0, expectedPageIndex: 0 },
    ])(
      'should step back to page $expectedPageIndex when a settled list holds $totalCount rows',
      ({ totalCount, expectedPageIndex }) => {
        // Given
        const { result } = renderOnThirdPage();

        // When
        act(() => {
          result.current.stepBackToLastPage({ totalCount, ...SETTLED });
        });

        // Then
        expect(result.current.pagination.pageIndex).toBe(expectedPageIndex);
        expect(result.current.cursor).toBe(toCursor(50, expectedPageIndex));
      }
    );

    it('should stay on the page when it still exists', () => {
      // Given
      const { result } = renderOnThirdPage();

      // When
      act(() => {
        result.current.stepBackToLastPage({ totalCount: 101, ...SETTLED });
      });

      // Then
      expect(result.current.pagination.pageIndex).toBe(2);
    });

    it.each([
      { state: 'loading', change: { isSuccess: false } },
      { state: 'refetching', change: { isFetching: true } },
      { state: 'a placeholder', change: { isPlaceholderData: true } },
    ])('should stay on the page while the list is $state', ({ change }) => {
      // Given
      const { result } = renderOnThirdPage();

      // When
      act(() => {
        result.current.stepBackToLastPage({
          totalCount: 0,
          ...SETTLED,
          ...change,
        });
      });

      // Then
      expect(result.current.pagination.pageIndex).toBe(2);
    });

    it('should stay on the page when the list has no count', () => {
      // Given
      const { result } = renderOnThirdPage();

      // When
      act(() => {
        result.current.stepBackToLastPage({
          totalCount: undefined,
          ...SETTLED,
        });
      });

      // Then
      expect(result.current.pagination.pageIndex).toBe(2);
    });
  });
});
