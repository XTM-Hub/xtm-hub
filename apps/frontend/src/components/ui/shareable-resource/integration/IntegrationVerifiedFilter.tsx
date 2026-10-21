import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import {
  ServiceListStorageKey,
  useServiceListStorage,
} from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';

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
      optionLabel={t('Service.OpenctiIntegrations.Filter.Verified.Label')}
      facetCounts={facetCounts}
    />
  );
};
