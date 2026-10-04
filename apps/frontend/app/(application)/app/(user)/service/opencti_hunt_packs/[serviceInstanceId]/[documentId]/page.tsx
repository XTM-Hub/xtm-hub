import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { getTranslations } from 'next-intl/server';
import PageLoader from './page-loader';

interface ServiceHuntPackPageProps {
  params: Promise<{ serviceInstanceId: string; documentId: string }>;
}

const Page = async ({ params }: ServiceHuntPackPageProps) => {
  const { serviceInstanceId, documentId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const decodedDocumentId = decodeURIComponent(documentId);
  const t = await getTranslations();
  const response = await serverFetchGraphQL<serviceByIdQuery>(
    ServiceByIdQuery,
    {
      service_instance_id: decodedServiceInstanceId,
    }
  );
  const serviceInstance = response?.data?.serviceInstanceById as unknown as
    serviceInstance_fragment$data | null | undefined;

  return (
    <>
      {decodedDocumentId && serviceInstance ? (
        <PageLoader
          documentId={decodedDocumentId}
          serviceInstance={serviceInstance}
        />
      ) : (
        <h1>{t('Utils.DocumentNotFound')}</h1>
      )}
    </>
  );
};

export default Page;
