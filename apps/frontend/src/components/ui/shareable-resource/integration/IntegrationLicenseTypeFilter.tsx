import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { LicenseType } from '@graphql/generated';

const ANALYTICS_LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  [LicenseType.Free]: 'Free',
  [LicenseType.Commercial]: 'Commercial',
};

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
      analyticsFilter={{
        filterKey: ServiceListFilterKey.LicenseType,
        resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
        valueLabels: ANALYTICS_LICENSE_TYPE_LABELS,
      }}
      optionLabel={t('Service.OpenctiIntegrations.Filter.LicenseType.Label')}
      facetCounts={facetCounts}
    />
  );
};
