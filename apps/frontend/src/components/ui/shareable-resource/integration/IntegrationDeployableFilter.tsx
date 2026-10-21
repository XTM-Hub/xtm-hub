import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectFormField } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';

interface IntegrationDeployableFilterProps {
  facetCounts?: ServiceListFacetCounts['managerSupported'];
}

export const IntegrationDeployableFilter = ({
  facetCounts,
}: IntegrationDeployableFilterProps) => {
  const { deployable, setDeployable } = useServiceListStorage(
    ServiceListStorageKey.OpenCTIIntegrationFeeds
  );
  const t = useTranslate();

  return (
    <LogicalMultiSelectFormField
      options={[
        {
          label: t(
            'Service.OpenctiIntegrations.Filter.ManagerSupported.AutomaticDeploy'
          ),
          value: 'true',
        },
        {
          label: t(
            'Service.OpenctiIntegrations.Filter.ManagerSupported.ManualDeploy'
          ),
          value: 'false',
        },
      ]}
      initialValue={deployable}
      noResultString={t('Utils.NotFound')}
      onValueChange={setDeployable}
      optionLabel={t(
        'Service.OpenctiIntegrations.Filter.ManagerSupported.Label'
      )}
      facetCounts={facetCounts}
    />
  );
};
