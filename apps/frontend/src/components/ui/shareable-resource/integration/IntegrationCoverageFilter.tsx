import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

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
 * differing only by case are one option, spelled as selected so the selection keeps its option.
 */
export const buildCoverageOptions = (
  facetCounts: Record<string, number> | undefined,
  selected: readonly string[],
  seen: readonly string[] = []
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
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));
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

/** Every value the facets returned since the filter was mounted. */
const useSeenFacetValues = (
  facetCounts: Record<string, number> | undefined
) => {
  const [seen, setSeen] = useState<string[]>(() =>
    Object.keys(facetCounts ?? {})
  );
  const added = Object.keys(facetCounts ?? {}).filter(
    (key) => !seen.includes(key)
  );
  if (added.length > 0) {
    const next = [...seen, ...added];
    setSeen(next);
    return next;
  }
  return seen;
};

interface IntegrationCoverageFilterProps {
  family: IntegrationCoverageFamily;
  facetCounts?: Record<string, number>;
}

export const IntegrationCoverageFilter = ({
  family,
  facetCounts,
}: IntegrationCoverageFilterProps) => {
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
  const seen = useSeenFacetValues(facetCounts);

  const options = useMemo(
    () => buildCoverageOptions(facetCounts, Object.keys(selection), seen),
    [facetCounts, selection, seen]
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
