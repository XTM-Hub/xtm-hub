'use client';

import Loader from '@/components/Loader';
import DocumentDetailLoader from '@/components/service/document/DocumentDetailLoader';
import IntegrationSlug from '@/components/service/integrations/[slug]/IntegrationSlug';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface PreloaderProps {
  documentId: string;
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ documentId, serviceInstance }: PreloaderProps) => {
  return serviceInstance ? (
    <DocumentDetailLoader
      documentId={documentId}
      serviceInstanceId={serviceInstance.id}>
      {(documentData) => (
        <IntegrationSlug
          serviceInstance={serviceInstance}
          documentData={documentData}
        />
      )}
    </DocumentDetailLoader>
  ) : (
    <Loader />
  );
};

export default PageLoader;
