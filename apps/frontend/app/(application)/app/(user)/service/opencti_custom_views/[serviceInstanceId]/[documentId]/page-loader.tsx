'use client';

import Loader from '@/components/Loader';
import CustomViewSlug from '@/components/service/custom-views/[slug]/CustomViewSlug';
import DocumentDetailLoader from '@/components/service/document/DocumentDetailLoader';
import { ServiceInstanceItemFragment } from '@graphql/generated';

interface PreloaderProps {
  documentId: string;
  serviceInstance: ServiceInstanceItemFragment;
}

const PageLoader = ({ documentId, serviceInstance }: PreloaderProps) => {
  return serviceInstance ? (
    <DocumentDetailLoader
      documentId={documentId}
      serviceInstanceId={serviceInstance.id}>
      {(documentData) => (
        <CustomViewSlug
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
