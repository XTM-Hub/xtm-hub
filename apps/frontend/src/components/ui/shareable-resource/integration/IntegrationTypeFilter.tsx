import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { availableIntegrationTypes } from '@/components/service/integrations/Integration.utils';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { IntegrationType } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface IntegrationTypeFilterProps {
  facetCounts?: ServiceListFacetCounts['integrationType'];
}

export const IntegrationTypeFilter = ({
  facetCounts,
}: IntegrationTypeFilterProps) => {
  const { integrationTypes, setIntegrationTypes } = useServiceListLocalStorage(
    ServiceListLocalStorageKey.OpenCTIIntegrationFeeds
  );

  const t = useTranslations();

  const options = useMemo(() => {
    const allOptions = Object.values(IntegrationType).map((feedType) => ({
      label: t(`Service.OpenctiIntegrations.Type.${feedType}`),
      value: feedType.toString(),
    }));
    const availableOption = allOptions
      .filter((option) =>
        availableIntegrationTypes.includes(option.value as IntegrationType)
      )
      .sort((a, b) => a.label.localeCompare(b.label));
    const comingSoonOption = allOptions
      .filter(
        (option) =>
          !availableIntegrationTypes.includes(option.value as IntegrationType)
      )
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...availableOption, ...comingSoonOption];
  }, [t]);

  return (
    <LogicalMultiSelectFormField
      options={options}
      initialValue={integrationTypes}
      noResultString={t('Utils.NotFound')}
      onValueChange={setIntegrationTypes}
      optionLabel={t('Service.OpenctiIntegrations.Filter.Type.Label')}
      facetCounts={facetCounts}
    />
  );
};
