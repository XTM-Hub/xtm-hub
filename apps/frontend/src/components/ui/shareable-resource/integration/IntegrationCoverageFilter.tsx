import { useCoverageObjectTypeLabel } from '@/components/service/form/UseCoverageObjectTypes';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

export type IntegrationCoverageFamily = 'objectType' | 'sector' | 'region';

const LABEL_KEYS: Record<IntegrationCoverageFamily, string> = {
  objectType: 'Service.OpenctiIntegrations.Filter.ObjectType.Label',
  sector: 'Service.OpenctiIntegrations.Filter.Sector.Label',
  region: 'Service.OpenctiIntegrations.Filter.Region.Label',
};

// Coverage values are matched case-insensitively, like the catalog search and its facets
const coverageKey = (value: string) => value.toLowerCase();

/**
 * Coverage values are open lists: the options are the values of the matched population, the values seen earlier in
 * the session and the current selection. A value the current filters leave without integration stays listed. Values
 * differing only by case are one option, spelled as selected so the selection keeps its option. Options are sorted
 * by label; the value stays the stored one.
 */
export const buildCoverageOptions = (
  facetCounts: Record<string, number> | undefined,
  selected: readonly string[],
  seen: readonly string[] = [],
  labelOf: (value: string) => string = (value) => value
) => {
  const byKey = new Map<string, string>();
  for (const value of [
    ...selected,
    ...Object.keys(facetCounts ?? {}),
    ...seen,
  ]) {
    if (!byKey.has(coverageKey(value))) {
      byKey.set(coverageKey(value), value);
    }
  }
  return [...byKey.values()]
    .map((value) => ({ label: labelOf(value), value }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/** Facet counts keyed by the option values, whatever the case of the facet values. */
export const buildCoverageOptionCounts = (
  facetCounts: Record<string, number> | undefined,
  options: ReadonlyArray<{ value: string }>
): Record<string, number> | undefined => {
  if (!facetCounts) {
    return undefined;
  }
  const countsByKey = new Map<string, number>();
  for (const [value, count] of Object.entries(facetCounts)) {
    const key = coverageKey(value);
    countsByKey.set(key, (countsByKey.get(key) ?? 0) + count);
  }
  return Object.fromEntries(
    options.map(({ value }) => [
      value,
      countsByKey.get(coverageKey(value)) ?? 0,
    ])
  );
};

/**
 * Values the facets returned while a list page is open. The page owns the store: a closed filter section unmounts
 * its filter without forgetting them, and leaving the page does.
 */
export interface SeenCoverageValues {
  get: (family: IntegrationCoverageFamily) => readonly string[];
  remember: (
    family: IntegrationCoverageFamily,
    values: readonly string[]
  ) => void;
  subscribe: (listener: () => void) => () => void;
}

export const createSeenCoverageValues = (): SeenCoverageValues => {
  const seen: Record<IntegrationCoverageFamily, readonly string[]> = {
    objectType: [],
    sector: [],
    region: [],
  };
  const listeners = new Set<() => void>();
  return {
    get: (family) => seen[family],
    remember: (family, values) => {
      const added = values.filter((value) => !seen[family].includes(value));
      if (added.length > 0) {
        seen[family] = [...seen[family], ...added];
        listeners.forEach((listener) => listener());
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const NOTHING_SEEN: readonly string[] = [];

/** Every value the facets returned while the page is open, the current ones included. */
const useSeenFacetValues = (
  store: SeenCoverageValues,
  family: IntegrationCoverageFamily,
  facetCounts: Record<string, number> | undefined
) => {
  const seen = useSyncExternalStore(
    store.subscribe,
    () => store.get(family),
    () => NOTHING_SEEN
  );
  useEffect(() => {
    store.remember(family, Object.keys(facetCounts ?? {}));
  }, [store, family, facetCounts]);
  return useMemo(
    () => [...new Set([...seen, ...Object.keys(facetCounts ?? {})])],
    [seen, facetCounts]
  );
};

interface IntegrationCoverageFilterProps {
  family: IntegrationCoverageFamily;
  facetCounts?: Record<string, number>;
  // The store of the list page; without it, the values are kept while the filter is mounted
  seenValues?: SeenCoverageValues;
}

export const IntegrationCoverageFilter = ({
  family,
  facetCounts,
  seenValues,
}: IntegrationCoverageFilterProps) => {
  const [ownSeenValues] = useState(createSeenCoverageValues);
  const t = useTranslations();
  const storage = useServiceListLocalStorage(
    ServiceListLocalStorageKey.OpenCTIIntegrationFeeds
  );
  const { selection, setSelection } = {
    objectType: {
      selection: storage.objectTypes,
      setSelection: storage.setObjectTypes,
    },
    sector: { selection: storage.sectors, setSelection: storage.setSectors },
    region: { selection: storage.regions, setSelection: storage.setRegions },
  }[family];
  const seen = useSeenFacetValues(
    seenValues ?? ownSeenValues,
    family,
    facetCounts
  );
  const objectTypeLabel = useCoverageObjectTypeLabel();

  const options = useMemo(
    () =>
      buildCoverageOptions(
        facetCounts,
        Object.keys(selection),
        seen,
        family === 'objectType' ? objectTypeLabel : undefined
      ),
    [facetCounts, selection, seen, family, objectTypeLabel]
  );
  const optionCounts = useMemo(
    () => buildCoverageOptionCounts(facetCounts, options),
    [facetCounts, options]
  );

  return (
    <LogicalMultiSelectFormField
      options={options}
      initialValue={selection}
      noResultString={t('Utils.NotFound')}
      onValueChange={setSelection}
      optionLabel={t(LABEL_KEYS[family])}
      facetCounts={optionCounts}
      disableEmptyFacets
    />
  );
};
