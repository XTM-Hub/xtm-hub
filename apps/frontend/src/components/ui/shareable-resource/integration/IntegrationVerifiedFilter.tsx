import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';

const ANALYTICS_SUPPORT_LABELS: Record<'true' | 'false', string> = {
  true: 'Supported by Filigran',
  false: 'Supported by Community',
};

interface IntegrationVerifiedFilterProps {
  facetCounts?: ServiceListFacetCounts['verified'];
}

export const IntegrationVerifiedFilter = ({
  facetCounts,
}: IntegrationVerifiedFilterProps) => {
  const { verified, setVerified } = useServiceListStorage(
    ServiceListStorageKey.OpenCTIIntegrationFeeds
  );
  const t = useTranslate();

  return (
    <LogicalMultiSelectFormField
      options={[
        {
          label: t('Service.OpenctiIntegrations.Filter.Verified.Verified'),
          value: 'true',
        },
        {
          label: t('Service.OpenctiIntegrations.Filter.Verified.Unverified'),
          value: 'false',
        },
      ]}
      initialValue={verified}
      noResultString={t('Utils.NotFound')}
      onValueChange={setVerified}
      analyticsFilter={{
        filterKey: ServiceListFilterKey.Verified,
        resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
        valueLabels: ANALYTICS_SUPPORT_LABELS,
      }}
      optionLabel={t('Service.OpenctiIntegrations.Filter.Verified.Label')}
      facetCounts={facetCounts}
    />
  );
};
