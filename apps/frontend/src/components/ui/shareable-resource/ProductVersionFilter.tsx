import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { PlatformIdentifier } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface ProductVersionFilterProps {
  platformIdentifier: PlatformIdentifier;
  facetCounts?: ServiceListFacetCounts['productVersion'];
}

export const ProductVersionFilter = ({
  platformIdentifier,
  facetCounts,
}: ProductVersionFilterProps) => {
  const t = useTranslations();
  const { platforms } = useRegisteredPlatforms(platformIdentifier, {
    onlyActive: true,
  });

  const options = useMemo(() => {
    return platforms
      .flatMap((platform) => {
        if (
          typeof platform.version !== 'string' ||
          typeof platform.title !== 'string'
        ) {
          return [];
        }
        return [
          {
            label: platform.title,
            value: platform.version,
          },
        ];
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [facetCounts, platforms]);

  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const { productVersions, setProductVersions } =
    useServiceListLocalStorage(localStorageKey);

  return (
    <LogicalMultiSelectFormField
      options={options}
      initialValue={productVersions}
      noResultString={t('Utils.NotFound')}
      onValueChange={setProductVersions}
      optionLabel={t('Service.OpenctiIntegrations.Filter.ProductVersion.Label')}
      facetCounts={facetCounts}
    />
  );
};
