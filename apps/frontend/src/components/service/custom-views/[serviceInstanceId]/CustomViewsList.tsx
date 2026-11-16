import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { LogicalFilters } from '@/hooks/use-logical-filters-from-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface CustomViewsListProps {
  logicalFilters: LogicalFilters;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

const CustomViewsList = ({
  logicalFilters,
  serviceInstance,
  search,
  onSearchChange,
}: CustomViewsListProps) => {
  return (
    <ShareableResourceServiceList
      logicalFilters={logicalFilters}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={onSearchChange}
      type={ShareableResourceType.OPENCTI_CUSTOM_VIEW}
      storageKey={ServiceListStorageKey.OpenCTICustomViews}
    />
  );
};

export default CustomViewsList;
