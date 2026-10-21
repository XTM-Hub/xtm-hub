import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import {
  ServiceListStorageKey,
  useServiceListStorage,
} from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { LicenseType } from '@graphql/generated';

interface IntegrationLicenseTypeFilterProps {
  facetCounts?: ServiceListFacetCounts['licenseType'];
}

export const IntegrationLicenseTypeFilter = ({
  facetCounts,
}: IntegrationLicenseTypeFilterProps) => {
  const { licenseTypes, setLicenseTypes } = useServiceListStorage(
    ServiceListStorageKey.OpenCTIIntegrationFeeds
  );
  const t = useTranslate();

  return (
    <LogicalMultiSelectFormField
      options={[
        {
          label: t('Service.OpenctiIntegrations.Filter.LicenseType.Free'),
          value: LicenseType.Free,
        },
        {
          label: t('Service.OpenctiIntegrations.Filter.LicenseType.Commercial'),
          value: LicenseType.Commercial,
        },
      ]}
      initialValue={licenseTypes}
      noResultString={t('Utils.NotFound')}
      onValueChange={setLicenseTypes}
      optionLabel={t('Service.OpenctiIntegrations.Filter.LicenseType.Label')}
      facetCounts={facetCounts}
    />
  );
};
