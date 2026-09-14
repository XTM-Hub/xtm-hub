'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export const useDetailParam = (key: string, value: string) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isOpen = searchParams.get(key) === value;

  const open = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, key, value]);

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [router, pathname, searchParams, key]);

  return { isOpen, open, close };
};
