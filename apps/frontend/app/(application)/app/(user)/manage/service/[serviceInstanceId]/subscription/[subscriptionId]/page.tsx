import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { ServiceInstanceItemFragment } from '@graphql/generated';
import PageLoader from './page-loader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ subscriptionId: string; serviceInstanceId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { subscriptionId, serviceInstanceId } = await params;
  const decodedSubscriptionId = decodeURIComponent(subscriptionId);
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const response = await serverFetchGraphQL<serviceByIdQuery>(
    ServiceByIdQuery,
    {
      service_instance_id: decodedServiceInstanceId,
    }
  );
  return (
    <PageLoader
      subscriptionId={decodedSubscriptionId}
      serviceInstance={
        response.data
          .serviceInstanceById as unknown as ServiceInstanceItemFragment
      }
    />
  );
};

export default Page;
