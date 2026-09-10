import { renderHook } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDetailParam } from './use-detail-param';

describe('useDetailParam', () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/roadmap');
    vi.mocked(useRouter).mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
  });

  const mockSearchParams = (query: string) =>
    vi
      .mocked(useSearchParams)
      .mockReturnValue(
        new URLSearchParams(query) as unknown as ReturnType<
          typeof useSearchParams
        >
      );

  it('reports isOpen when the param matches the value', () => {
    mockSearchParams('epicId=epic-1');

    const { result } = renderHook(() => useDetailParam('epicId', 'epic-1'));

    expect(result.current.isOpen).toBe(true);
  });

  it('reports closed when the param does not match', () => {
    mockSearchParams('epicId=other');

    const { result } = renderHook(() => useDetailParam('epicId', 'epic-1'));

    expect(result.current.isOpen).toBe(false);
  });

  it('sets the param while preserving existing ones on open', () => {
    mockSearchParams('tab=roadmap');

    const { result } = renderHook(() => useDetailParam('epicId', 'epic-1'));
    result.current.open();

    expect(replace).toHaveBeenCalledWith('/roadmap?tab=roadmap&epicId=epic-1', {
      scroll: false,
    });
  });

  it('removes only its param on close, keeping the query string', () => {
    mockSearchParams('tab=roadmap&epicId=epic-1');

    const { result } = renderHook(() => useDetailParam('epicId', 'epic-1'));
    result.current.close();

    expect(replace).toHaveBeenCalledWith('/roadmap?tab=roadmap', {
      scroll: false,
    });
  });

  it('drops the query string entirely when closing the last param', () => {
    mockSearchParams('epicId=epic-1');

    const { result } = renderHook(() => useDetailParam('epicId', 'epic-1'));
    result.current.close();

    expect(replace).toHaveBeenCalledWith('/roadmap', { scroll: false });
  });
});
