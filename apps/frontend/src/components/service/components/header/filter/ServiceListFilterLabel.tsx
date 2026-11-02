import { useUseCases } from '@/components/admin/use-case/use-use-cases';
import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';

interface ServiceListFilterLabelProps {
  type: string;
  facetCounts?: ServiceListFacetCounts['useCase'];
}
export const ServiceListFilterLabel = ({
  type,
  facetCounts,
}: ServiceListFilterLabelProps) => {
  const t = useTranslate();
  const { storageKey } = useServiceListStorageKeyContext();
  const { labels, setLabels } = useServiceListStorage(storageKey);

  const labelOptions = useUseCases({ documentType: type }).map(
    ({ name, id }) => ({
      label: name,
      value: id,
    })
  );

  return (
    <LogicalMultiSelectFormField
      options={labelOptions}
      initialValue={labels}
      noResultString={t('Utils.NotFound')}
      onValueChange={setLabels}
      optionLabel={t('GenericActions.FilterUseCasesLabel')}
      facetCounts={facetCounts}
    />
  );
};
