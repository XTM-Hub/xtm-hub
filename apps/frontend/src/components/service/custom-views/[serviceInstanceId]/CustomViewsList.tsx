import { ServiceListFilterEntityType } from '@/components/service/components/header/filter/ServiceListFilterEntityType';
import {
  ServiceListFilterKey,
  ServiceListFilterMap,
} from '@/components/service/components/header/ServiceListHeader';
import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentFacets } from '@generated/documentFacets.graphql';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { PreloadedQuery } from 'react-relay';

interface CustomViewsListProps {
  queryRef: PreloadedQuery<documentsQuery>;
  queryRefFacet: PreloadedQuery<documentFacets>;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

const CustomViewsList = ({
  queryRef,
  queryRefFacet,
  serviceInstance,
  search,
  onSearchChange,
}: CustomViewsListProps) => {
  const additionalFilters: ServiceListFilterMap = {
    [ServiceListFilterKey.EntityType]: {
      node: <ServiceListFilterEntityType />,
    },
  };

  return (
    <ShareableResourceServiceList
      queryRef={queryRef}
      queryRefFacet={queryRefFacet}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={onSearchChange}
      type={ShareableResourceType.OPENCTI_CUSTOM_VIEW}
      localStorageKey={ServiceListLocalStorageKey.OpenCTICustomViews}
      additionalFilters={additionalFilters}
    />
  );
};

export default CustomViewsList;
