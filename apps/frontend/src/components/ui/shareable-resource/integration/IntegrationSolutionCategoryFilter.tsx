import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { useSolutionCategories } from '@/components/service/form/UseSolutionCategories';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { FiligranProduct } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface IntegrationSolutionCategoryFilterProps {
  facetCounts?: ServiceListFacetCounts['solutionCategory'];
}

export const IntegrationSolutionCategoryFilter = ({
  facetCounts,
}: IntegrationSolutionCategoryFilterProps) => {
  const t = useTranslations();
  const categories = useSolutionCategories(FiligranProduct.Opencti);
  const options = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    [categories]
  );

  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const { solutionCategories, setSolutionCategories } =
    useServiceListLocalStorage(localStorageKey);

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
