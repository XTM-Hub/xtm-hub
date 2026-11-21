import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import { notFound } from 'next/navigation';
import PageLoader from './page-loader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ subscriptionId: string; serviceInstanceId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { subscriptionId, serviceInstanceId } = await params;
  const decodedSubscriptionId = decodeURIComponent(subscriptionId);
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const serviceInstance = await fetchServiceInstanceById(
    decodedServiceInstanceId
  );
  if (!serviceInstance) {
    notFound();
  }
  return (
    <PageLoader
      subscriptionId={decodedSubscriptionId}
      serviceInstance={serviceInstance}
    />
  );
};

export default Page;
