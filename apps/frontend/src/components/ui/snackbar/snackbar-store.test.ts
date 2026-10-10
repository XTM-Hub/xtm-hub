import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type SnackbarStoreModule =
  typeof import('@/components/ui/snackbar/snackbar-store');

const FIRST = { severity: 'error', title: 'First message' } as const;
const SECOND = { severity: 'success', title: 'Second message' } as const;
const THIRD = { severity: 'success', title: 'Third message' } as const;

let store: SnackbarStoreModule;

describe('snackbar-store', () => {
  // The messages live at module level: a fresh module per test keeps one
  // test's messages out of the next.
  beforeEach(async () => {
    vi.resetModules();
    store = await import('@/components/ui/snackbar/snackbar-store');
  });

  it('should close the open message and keep it until the next raise when another one is raised', () => {
    // Given
    const { result } = renderHook(() => store.useSnackbars());
    act(() => {
      store.showSnackbar(FIRST);
    });

    // When
    act(() => {
      store.showSnackbar(SECOND);
    });

    // Then
    expect(result.current).toEqual([
      expect.objectContaining({ ...SECOND, open: true }),
      expect.objectContaining({ ...FIRST, open: false }),
    ]);

    // When
    act(() => {
      store.showSnackbar(THIRD);
    });

    // Then
    expect(result.current).toEqual([
      expect.objectContaining({ ...THIRD, open: true }),
      expect.objectContaining({ ...SECOND, open: false }),
    ]);
  });

  it('should mark the message closed and keep it when it is closed', () => {
    // Given
    const { result } = renderHook(() => store.useSnackbars());
    act(() => {
      store.showSnackbar(FIRST);
    });

    // When
    act(() => {
      store.closeSnackbar(result.current[0].id);
    });

    // Then
    expect(result.current).toEqual([
      expect.objectContaining({ ...FIRST, open: false }),
    ]);
  });
});
