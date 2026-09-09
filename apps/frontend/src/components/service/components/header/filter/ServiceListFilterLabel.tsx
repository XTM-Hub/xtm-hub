import { useUseCases } from '@/components/admin/use-case/use-use-cases';
import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { useTranslations } from 'next-intl';

interface ServiceListFilterLabelProps {
  type: string;
  facetCounts?: ServiceListFacetCounts['useCase'];
}
export const ServiceListFilterLabel = ({
  type,
  facetCounts,
}: ServiceListFilterLabelProps) => {
  const t = useTranslations();
  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const { labels, setLabels } = useServiceListLocalStorage(localStorageKey);

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
