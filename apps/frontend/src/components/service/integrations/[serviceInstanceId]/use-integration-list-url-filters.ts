'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ALL_FILTER_PARAMS,
  AllFilters,
  allFiltersKey,
  buildAllFiltersSearchParams,
  parseAllFiltersFromWindowSearch,
} from './integration-list-url-filters.utils';

interface UseIntegrationListUrlFiltersParams {
  filters: AllFilters;
  resetAll: () => void;
  setFilters: (value: AllFilters) => void;
}

export const useIntegrationListUrlFilters = ({
  filters,
  resetAll,
  setFilters,
}: UseIntegrationListUrlFiltersParams) => {
  const router = useRouter();
  const pathname = usePathname();

  const [filtersFromUrl] = useState<AllFilters>(
    parseAllFiltersFromWindowSearch
  );
  const lastSyncedKey = useRef<string>(allFiltersKey(filtersFromUrl));

  useLayoutEffect(() => {
    const hasAnyFilter = ALL_FILTER_PARAMS.some(
      (name) => Object.keys(filtersFromUrl[name]).length > 0
    );
    if (!hasAnyFilter) return;

    resetAll();
    setFilters(filtersFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty: runs once on mount only.

  useEffect(() => {
    const currentKey = allFiltersKey(filters);
    if (currentKey === lastSyncedKey.current) return;
    lastSyncedKey.current = currentKey;

    const params = new URLSearchParams(window.location.search);
    for (const name of ALL_FILTER_PARAMS) params.delete(name);

    new URLSearchParams(buildAllFiltersSearchParams(filters)).forEach(
      (value, key) => {
        params.set(key, value);
      }
    );

    const newSearch = params.toString();
    router.replace(`${pathname}${newSearch ? `?${newSearch}` : ''}`, {
      scroll: false,
    });
  }, [filters, pathname, router]);
};
