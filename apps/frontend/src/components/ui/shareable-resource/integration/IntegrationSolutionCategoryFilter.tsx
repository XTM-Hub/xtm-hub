import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { useSolutionCategories } from '@/components/service/form/UseSolutionCategories';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { FiligranProduct } from '@graphql/generated';
import { useMemo } from 'react';

interface IntegrationSolutionCategoryFilterProps {
  facetCounts?: ServiceListFacetCounts['solutionCategory'];
}

export const IntegrationSolutionCategoryFilter = ({
  facetCounts,
}: IntegrationSolutionCategoryFilterProps) => {
  const t = useTranslate();
  const categories = useSolutionCategories(FiligranProduct.Opencti);
  const options = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    [categories]
  );

  const { storageKey } = useServiceListStorageKeyContext();
  const { solutionCategories, setSolutionCategories } =
    useServiceListStorage(storageKey);

  return (
    <LogicalMultiSelectFormField
      options={options}
      initialValue={solutionCategories}
      noResultString={t('Utils.NotFound')}
      onValueChange={setSolutionCategories}
      optionLabel={t(
        'Service.OpenctiIntegrations.Filter.SolutionCategory.Label'
      )}
      facetCounts={facetCounts}
    />
  );
};
