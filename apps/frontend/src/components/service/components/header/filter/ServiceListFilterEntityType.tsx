import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { ENTITY_TYPES } from '@/utils/shareable-resources/entity-type';

interface ServiceListFilterEntityTypeProps {
  facetCounts?: ServiceListFacetCounts['entityType'];
}

export const ServiceListFilterEntityType = ({
  facetCounts,
}: ServiceListFilterEntityTypeProps) => {
  const t = useTranslate();
  const { storageKey } = useServiceListStorageKeyContext();
  const { entityTypes, setEntityTypes } = useServiceListStorage(storageKey);

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
