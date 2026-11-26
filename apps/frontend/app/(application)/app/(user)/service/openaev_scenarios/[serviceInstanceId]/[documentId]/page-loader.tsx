'use client';

import Loader from '@/components/Loader';
import DocumentDetailLoader from '@/components/service/document/DocumentDetailLoader';
import OpenaevScenarioSlug from '@/components/service/openaev-scenarios/[slug]/OpenaevScenarioSlug';
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
