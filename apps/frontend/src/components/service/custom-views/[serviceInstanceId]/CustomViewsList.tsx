import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { PreloadedQuery } from 'react-relay';

interface CustomViewsListProps {
  queryRef: PreloadedQuery<documentsQuery>;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

const CustomViewsList = ({
  queryRef,
  serviceInstance,
  search,
  onSearchChange,
}: CustomViewsListProps) => {
  return (
    <ShareableResourceServiceList
      queryRef={queryRef}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={onSearchChange}
      type={ShareableResourceType.OPENCTI_CUSTOM_VIEW}
      storageKey={ServiceListStorageKey.OpenCTICustomViews}
    />
  );
};

export default CustomViewsList;
