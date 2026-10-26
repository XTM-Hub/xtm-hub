'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export const useDetailParam = (key: string, value: string) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isOpen = searchParams.get(key) === value;

  const open = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [pathname, searchParams, key, value]);

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const queryString = params.toString();
    window.history.replaceState(
      null,
      '',
      queryString ? `${pathname}?${queryString}` : pathname
    );
  }, [pathname, searchParams, key]);

  return { isOpen, open, close };
};
