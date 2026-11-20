'use client';

import Loader from '@/components/Loader';
import DashboardDetails from '@/components/service/custom-dashboards/[slug]/CustomDashboardDetails';
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
        <DashboardDetails
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
