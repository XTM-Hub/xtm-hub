import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { CONNECTOR_TYPES } from '@/components/service/integrations/connector-type/connector-type.utils';
import { useConnectorTypeLabels } from '@/components/service/integrations/connector-type/use-connector-type-labels';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface IntegrationConnectorTypeFilterProps {
  facetCounts?: ServiceListFacetCounts['connectorType'];
}

export const IntegrationConnectorTypeFilter = ({
  facetCounts,
}: IntegrationConnectorTypeFilterProps) => {
  const { connectorTypes, setConnectorTypes } = useServiceListLocalStorage(
    ServiceListLocalStorageKey.OpenCTIIntegrationFeeds
  );
  const t = useTranslations();
  const { connectorTypeLabel } = useConnectorTypeLabels();

  const options = useMemo(
    () =>
      CONNECTOR_TYPES.map((connectorType) => ({
        label: connectorTypeLabel(connectorType),
        value: connectorType,
      })).sort((a, b) => a.label.localeCompare(b.label)),
    [connectorTypeLabel]
  );

  return (
    <LogicalMultiSelectFormField
      options={options}
      initialValue={connectorTypes}
      noResultString={t('Utils.NotFound')}
      onValueChange={setConnectorTypes}
      optionLabel={t('Service.OpenctiIntegrations.Filter.ConnectorType.Label')}
      facetCounts={facetCounts}
    />
  );
};
