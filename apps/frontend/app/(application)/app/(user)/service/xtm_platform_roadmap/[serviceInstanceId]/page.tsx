import { EpicListSkeleton } from '@/components/epic/EpicListSkeleton';
import {
  PrefetchedEpicList,
  prefetchEpicList,
} from '@/components/epic/PrefetchedEpicList';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { Suspense } from 'react';
import PageLoader from './page-loader';

interface ServiceRoadmapPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}
const Page = async ({ params }: ServiceRoadmapPageProps) => {
  const { serviceInstanceId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);

  // Started before the service instance is awaited, so both requests run at once.
  const epicListState = prefetchEpicList();
  const response = await serverFetchGraphQL<serviceByIdQuery>(
    ServiceByIdQuery,
    {
      service_instance_id: decodedServiceInstanceId,
    }
  );
  return (
    <Suspense fallback={<EpicListSkeleton />}>
      <PrefetchedEpicList dehydratedState={epicListState}>
        <PageLoader
          serviceInstance={
            response.data
              .serviceInstanceById as unknown as serviceInstance_fragment$data
          }
        />
      </PrefetchedEpicList>
    </Suspense>
  );
};

export default Page;
