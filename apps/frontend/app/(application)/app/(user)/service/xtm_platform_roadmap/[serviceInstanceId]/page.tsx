import { EpicListSkeleton } from '@/components/epic/EpicListSkeleton';
import {
  PrefetchedEpicList,
  prefetchEpicList,
} from '@/components/epic/PrefetchedEpicList';
import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import { notFound } from 'next/navigation';
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
  const serviceInstance = await fetchServiceInstanceById(
    decodedServiceInstanceId
  );
  if (!serviceInstance) {
    notFound();
  }
  return (
    <Suspense fallback={<EpicListSkeleton />}>
      <PrefetchedEpicList dehydratedState={epicListState}>
        <PageLoader serviceInstance={serviceInstance} />
      </PrefetchedEpicList>
    </Suspense>
  );
};

export default Page;
