import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';

// Module-scoped, non-persisted set of filters added via the add-filter
// combobox during this browser session (scoped by list + filter key). This
// lets a freshly added filter (e.g. OpenctiVersionFilter) auto-open its
// popover once, while a filter already selected on page load (restored from
// localStorage) does not. It intentionally does not survive a page reload.
const justAddedFilterKeys = new Set<string>();

const toJustAddedKey = (
  localStorageKey: ServiceListLocalStorageKey,
  filterKey: ServiceListFilterKey
) => `${localStorageKey}:${filterKey}`;

/**
 * Whether a filter was just added via the add-filter combobox in this
 * browser session, as opposed to being restored from localStorage on page
 * load. Stays `true` across re-renders until explicitly cleared with
 * `clearJustAddedFilter` (typically once, right after mount).
 */
export const wasFilterJustAdded = (
  localStorageKey: ServiceListLocalStorageKey,
  filterKey: ServiceListFilterKey
) => justAddedFilterKeys.has(toJustAddedKey(localStorageKey, filterKey));

export const clearJustAddedFilter = (
  localStorageKey: ServiceListLocalStorageKey,
  filterKey: ServiceListFilterKey
) => {
  justAddedFilterKeys.delete(toJustAddedKey(localStorageKey, filterKey));
};

export const useServiceListFilters = () => {
  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const { selectedFilters, setSelectedFilters } =
    useServiceListLocalStorage(localStorageKey);

  const addFilter = (filterKey: ServiceListFilterKey) => {
    justAddedFilterKeys.add(toJustAddedKey(localStorageKey, filterKey));
    setSelectedFilters([...selectedFilters, filterKey]);
  };

  const removeFilter = (filterKey: ServiceListFilterKey) => {
    setSelectedFilters(selectedFilters.filter((key) => key !== filterKey));
  };

  return {
    addFilter,
    removeFilter,
    selectedFilters,
  };
};
