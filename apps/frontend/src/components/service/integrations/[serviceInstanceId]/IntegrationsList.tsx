import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { PreloadedQuery } from 'react-relay';

interface IntegrationsListProps {
  queryRef: PreloadedQuery<documentsQuery>;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

const IntegrationsList = ({
  queryRef,
  serviceInstance,
  search,
  onSearchChange,
}: IntegrationsListProps) => {
  const { localStorageKey } = useIntegrationListStorage();

  return (
    <ShareableResourceServiceList
      queryRef={queryRef}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={onSearchChange}
      type={ShareableResourceType.OPENCTI_INTEGRATION}
      localStorageKey={localStorageKey}
    />
  );
};

export default IntegrationsList;
