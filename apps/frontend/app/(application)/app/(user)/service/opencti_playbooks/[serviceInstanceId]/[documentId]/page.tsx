import { getTranslate } from '@/hooks/get-translate';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { ServiceInstanceItemFragment } from '@graphql/generated';
import PageLoader from './page-loader';

interface ServicePlaybookPageProps {
  params: Promise<{ serviceInstanceId: string; documentId: string }>;
}

const Page = async ({ params }: ServicePlaybookPageProps) => {
  const { serviceInstanceId, documentId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const decodedDocumentId = decodeURIComponent(documentId);
  const t = await getTranslate();
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
        <h1>{t('Utils.DocumentNotFound')}</h1>
      )}
    </>
  );
};

export default Page;
