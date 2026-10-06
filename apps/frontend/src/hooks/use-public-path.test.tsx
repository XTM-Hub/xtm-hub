import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePathname } from 'next/navigation';
import usePublicPath from './use-public-path';

describe('usePublicPath', () => {
  it.each`
    expected | path
    ${true}  | ${'/cybersecurity-solutions'}
    ${true}  | ${'/cybersecurity-solutions/abc'}
    ${true}  | ${'/ja/cybersecurity-solutions'}
    ${true}  | ${'/ja/cybersecurity-solutions/abc'}
    ${true}  | ${'/en/cybersecurity-solutions/abc/def'}
    ${true}  | ${'/fr/cybersecurity-solutions'}
    ${false} | ${'/cezfze/cybersecurity-solutions'}
    ${false} | ${'/random'}
    ${false} | ${'/cyber'}
    ${false} | ${'/something/cybersecurity-solutions'}
    ${false} | ${'/ja/app/something'}
  `('should return $expected for pathname $path', ({ expected, path }) => {
    vi.mocked(usePathname).mockReturnValue(path);

    const { result } = renderHook(() => usePublicPath());

    expect(result.current).toBe(expected);
  });
});
