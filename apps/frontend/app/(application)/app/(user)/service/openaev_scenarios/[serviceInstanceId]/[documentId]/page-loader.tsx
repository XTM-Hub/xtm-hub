'use client';

import Loader from '@/components/Loader';
import DocumentDetailLoader from '@/components/service/document/DocumentDetailLoader';
import OpenaevScenarioSlug from '@/components/service/openaev-scenarios/[slug]/OpenaevScenarioSlug';
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
        <OpenaevScenarioSlug
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
