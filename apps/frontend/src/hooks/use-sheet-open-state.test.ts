import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSheetOpenState } from './use-sheet-open-state';

const OPEN = true;
const CLOSED = false;

type SheetProps = { initialOpen: boolean; onClose: () => void };

const renderSheetOpenState = (props: SheetProps) =>
  renderHook(
    ({ initialOpen, onClose }: SheetProps) =>
      useSheetOpenState(initialOpen, onClose),
    { initialProps: props }
  );

describe('useSheetOpenState', () => {
  it.each([
    ['an open sheet closes', OPEN, [CLOSED], 1],
    ['a closed sheet closes', CLOSED, [CLOSED], 0],
    ['a closed sheet opens', CLOSED, [OPEN], 0],
    ['an open sheet closes twice', OPEN, [CLOSED, CLOSED], 1],
    [
      'a sheet closes, reopens and closes again',
      OPEN,
      [CLOSED, OPEN, CLOSED],
      2,
    ],
  ])(
    'should call onClose the expected number of times when %s',
    (_context, initialOpen, changes, expectedCalls) => {
      // Given
      const onClose = vi.fn();
      const { result } = renderSheetOpenState({ initialOpen, onClose });

      // When
      changes.forEach((open) => act(() => result.current[1](open)));

      // Then
      expect(onClose).toHaveBeenCalledTimes(expectedCalls);
    }
  );

  it('should report the last requested open state when the sheet changes', () => {
    // Given
    const { result } = renderSheetOpenState({
      initialOpen: OPEN,
      onClose: vi.fn(),
    });

    // When
    act(() => result.current[1](CLOSED));

    // Then
    expect(result.current[0]).toBe(CLOSED);
  });

  it('should call the latest onClose when the sheet closes after a re-render with a new callback', () => {
    // Given
    const notified: string[] = [];
    const { result, rerender } = renderSheetOpenState({
      initialOpen: OPEN,
      onClose: () => notified.push('first'),
    });
    const handleOpenSheet = result.current[1];
    rerender({ initialOpen: OPEN, onClose: () => notified.push('latest') });

    // When
    act(() => handleOpenSheet(CLOSED));

    // Then
    expect(notified).toEqual(['latest']);
  });
});
