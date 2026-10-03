import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export type IntegrationCoverageFamily = 'objectType' | 'sector' | 'region';

const LABEL_KEYS: Record<IntegrationCoverageFamily, string> = {
  objectType: 'Service.OpenctiIntegrations.Filter.ObjectType.Label',
  sector: 'Service.OpenctiIntegrations.Filter.Sector.Label',
  region: 'Service.OpenctiIntegrations.Filter.Region.Label',
};

/** Coverage values are open lists: the options are the values of the matched population plus the current selection. */
export const buildCoverageOptions = (
  facetCounts: Record<string, number> | undefined,
  selected: readonly string[]
) =>
  [...new Set([...Object.keys(facetCounts ?? {}), ...selected])]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));

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

  const options = useMemo(
    () => buildCoverageOptions(facetCounts, Object.keys(selection)),
    [facetCounts, selection]
  );

  return (
    <LogicalMultiSelectFormField
      options={options}
      initialValue={selection}
      noResultString={t('Utils.NotFound')}
      onValueChange={setSelection}
      optionLabel={t(LABEL_KEYS[family])}
      facetCounts={facetCounts}
    />
  );
};
