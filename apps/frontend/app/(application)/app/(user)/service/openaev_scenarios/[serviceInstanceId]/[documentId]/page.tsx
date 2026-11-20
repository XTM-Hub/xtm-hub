import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { ServiceInstanceItemFragment } from '@graphql/generated';
import PageLoader from './page-loader';

interface ServiceCustomDashboardsPageProps {
  params: Promise<{ serviceInstanceId: string; documentId: string }>;
}

const Page = async ({ params }: ServiceCustomDashboardsPageProps) => {
  const { serviceInstanceId, documentId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const decodedDocumentId = decodeURIComponent(documentId);
  const response = await serverFetchGraphQL<serviceByIdQuery>(
    ServiceByIdQuery,
    {
      service_instance_id: decodedServiceInstanceId,
    }
  );

  return (
    <>
      {decodedDocumentId && response ? (
        <PageLoader
          documentId={decodedDocumentId}
          serviceInstance={
            response.data
              .serviceInstanceById as unknown as ServiceInstanceItemFragment
          }
        />
      ) : (
        <h1>Document not found</h1>
      )}
    </>
  );
};

export default Page;
