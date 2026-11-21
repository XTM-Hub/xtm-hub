import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import { getTranslate } from '@/hooks/get-translate';
import PageLoader from './page-loader';

interface ServicePlaybookPageProps {
  params: Promise<{ serviceInstanceId: string; documentId: string }>;
}

const Page = async ({ params }: ServicePlaybookPageProps) => {
  const { serviceInstanceId, documentId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const decodedDocumentId = decodeURIComponent(documentId);
  const t = await getTranslate();
  const serviceInstance = await fetchServiceInstanceById(
    decodedServiceInstanceId
  );

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
