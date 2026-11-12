'use client';

import Loader from '@/components/Loader';
import DocumentDetailLoader from '@/components/service/document/DocumentDetailLoader';
import OpenctiPlaybookSlug from '@/components/service/opencti-playbooks/[slug]/OpenctiPlaybookSlug';
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
        <OpenctiPlaybookSlug
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
