import {
  ServiceListFilter,
  ServiceListFilterKey,
  ServiceListFilterMap,
} from '@/components/service/components/header/ServiceListHeader';
import { useServiceListFilters } from '@/hooks/use-service-list-filters';

import { AndSeparator } from '@/components/ui/shareable-resource/logical-multi-select/SelectedValuesDisplay';
import React, { useMemo } from 'react';

interface ServiceListFilterSectionProps {
  filters: ServiceListFilterMap;
}

export const ServiceListFilterSection = ({
  filters,
}: ServiceListFilterSectionProps) => {
  const { selectedFilters } = useServiceListFilters();

  const filtersList = useMemo(() => {
    // A selected filter key may not have a matching entry in `filters` (e.g.
    // "product_version" stays selected in storage while the
    // DecouplingConnectors feature flag swaps it for "opencti_version" in
    // the filter map). Filtering those out first keeps the AND separator
    // index in sync with what is actually rendered, avoiding an orphaned
    // "AND" before the first visible chip.
    const visibleFilters = selectedFilters
      .map((selectedFilterKey) => ({
        key: selectedFilterKey,
        filter: filters[selectedFilterKey],
      }))
      .filter(
        (
          entry
        ): entry is { key: ServiceListFilterKey; filter: ServiceListFilter } =>
          !!entry.filter
      );

    return visibleFilters.map(({ key, filter }, index) => (
      <React.Fragment key={key}>
        {index > 0 && <AndSeparator />}
        <div>{filter.node}</div>
      </React.Fragment>
    ));
  }, [selectedFilters, filters]);

  return (
    <div className="flex justify-start gap-s flex-wrap">{filtersList}</div>
  );
};
