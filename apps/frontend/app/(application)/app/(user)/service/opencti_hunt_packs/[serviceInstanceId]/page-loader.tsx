'use client';

import HuntPackServiceList from '@/components/service/opencti-hunt-packs/HuntPackServiceList';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface PageLoaderProps {
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ serviceInstance }: PageLoaderProps) => {
  const { search, setSearch } = useServiceListLocalStorage(
    ServiceListLocalStorageKey.OpenCTIHuntPacks
  );

  return (
    <HuntPackServiceList
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={setSearch}
    />
  );
};

export default PageLoader;
