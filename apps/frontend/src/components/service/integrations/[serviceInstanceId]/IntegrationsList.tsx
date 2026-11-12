import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { LogicalFilters } from '@/hooks/use-logical-filters-from-storage';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface IntegrationsListProps {
  logicalFilters: LogicalFilters;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

const IntegrationsList = ({
  logicalFilters,
  serviceInstance,
  search,
  onSearchChange,
}: IntegrationsListProps) => {
  const { storageKey } = useIntegrationListStorage();

  return (
    <ShareableResourceServiceList
      logicalFilters={logicalFilters}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={onSearchChange}
      type={ShareableResourceType.OPENCTI_INTEGRATION}
      storageKey={storageKey}
    />
  );
};

export default IntegrationsList;
