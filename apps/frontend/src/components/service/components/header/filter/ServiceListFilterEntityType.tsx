import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { ENTITY_TYPES } from '@/utils/shareable-resources/entity-type';
import { useTranslations } from 'next-intl';

interface ServiceListFilterEntityTypeProps {
  facetCounts?: ServiceListFacetCounts['entityType'];
}

export const ServiceListFilterEntityType = ({
  facetCounts,
}: ServiceListFilterEntityTypeProps) => {
  const t = useTranslations();
  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const { entityTypes, setEntityTypes } =
    useServiceListLocalStorage(localStorageKey);

  const entityTypeOptions = ENTITY_TYPES.map(({ name, id }) => ({
    label: name,
    value: id,
  }));

  return (
    <LogicalMultiSelectFormField
      options={entityTypeOptions}
      initialValue={entityTypes}
      noResultString={t('Utils.NotFound')}
      onValueChange={setEntityTypes}
      optionLabel={t('GenericActions.FilterEntityTypesLabel')}
      facetCounts={facetCounts}
    />
  );
};
